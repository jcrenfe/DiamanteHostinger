// Bloqueo por fecha entre procesos distintos (varias instancias del servidor) y script de administrador.
require('./helpers/env');
const db = require('./helpers/db');

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const bcrypt = require('bcryptjs');

const run = (file, args) => new Promise((resolve) => {
    const child = spawn(process.execPath, [file, ...args], { env: process.env });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out: out.trim() }));
});

test.after(() => db.client.$disconnect());
test.beforeEach(() => db.reset());

test('bloqueo entre procesos: 4 instancias reservan la misma hora a la vez → solo una lo consigue', async () => {
    const worker = path.join(__dirname, 'helpers', 'lock-worker.js');
    const results = await Promise.all(['w1', 'w2', 'w3', 'w4'].map(id => run(worker, [id])));
    const outs = results.map(r => r.out.split('\n').pop());
    assert.deepEqual(outs.slice().sort(), ['ocupada', 'ocupada', 'ocupada', 'reservada'], results.map(r => r.out).join(' | '));
    assert.equal((await db.orders()).length, 1);
});

test('el bloqueo se libera aunque la sección crítica falle', async () => {
    const { withLock } = require('../src/config/prisma');
    await assert.rejects(withLock('slot:2099-09-10', async () => { throw new Error('fallo a propósito'); }));
    const started = Date.now();
    assert.equal(await withLock('slot:2099-09-10', async () => 'libre'), 'libre');
    assert.ok(Date.now() - started < 2000, 'el segundo bloqueo no debería esperar');
});

test('set-admin-password: da rol de administrador y contraseña a un usuario existente; avisa si no existe', () => {
    const script = path.resolve(__dirname, '..', 'set-admin-password.js');
    return (async () => {
        await db.client.user.create({ data: { uid: 'u1', email: 'jefe@x.com' } });
        execFileSync(process.execPath, [script, 'jefe@x.com', 'claveSegura1'], { env: process.env, stdio: 'pipe' });
        const u = await db.client.user.findUnique({ where: { email: 'jefe@x.com' } });
        assert.equal(u.role, 'admin');
        assert.ok(await bcrypt.compare('claveSegura1', u.password));
        assert.throws(() => execFileSync(process.execPath, [script, 'nadie@x.com', 'claveSegura1'], { env: process.env, stdio: 'pipe' }));
        assert.throws(() => execFileSync(process.execPath, [script, 'jefe@x.com', 'corta'], { env: process.env, stdio: 'pipe' }));
    })();
});
