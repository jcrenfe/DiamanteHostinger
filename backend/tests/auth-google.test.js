// Login con Google: la identidad debe salir del ID token verificado, nunca de datos del cliente.
// Base de datos real de pruebas.
require('./helpers/env');
const { src } = require('./helpers/stubs');
const db = require('./helpers/db');

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');

const users = () => db.client.user.findMany({ orderBy: { id: 'asc' } });
const addUser = (data) => db.client.user.create({ data });

const { setCertsProvider, PROJECT_ID } = require(src('services', 'googleIdToken.js'));
const authRoutes = require(src('routes', 'auth.js'));

const keyA = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const keyB = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }); // atacante: NO está en las claves de Google
const pem = (k) => k.publicKey.export({ type: 'spki', format: 'pem' });
setCertsProvider(async () => ({ kidA: pem(keyA) }));

const idToken = (claims = {}, { key = keyA, kid = 'kidA', alg = 'RS256' } = {}) => jwt.sign(
    { email: 'ana@gmail.com', email_verified: true, name: 'Ana', ...claims },
    key.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    { algorithm: alg, keyid: kid, subject: claims.sub || 'google-uid-1', audience: PROJECT_ID, issuer: `https://securetoken.google.com/${PROJECT_ID}`, expiresIn: '1h', ...(claims._opts || {}) }
);

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
let server; let base;
test.before(async () => { await new Promise(r => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}/api/auth`; });
test.after(async () => { server.close(); await db.client.$disconnect(); });
test.beforeEach(() => db.reset());

const google = (body) => fetch(`${base}/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('un ID token válido crea el usuario con el email y uid verificados y devuelve sesión', async () => {
    const res = await google({ idToken: idToken() });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.email, 'ana@gmail.com');
    assert.equal(body.user.role, 'cliente');
    assert.equal((await users())[0].uid, 'google-uid-1');
    assert.equal(jwt.verify(body.token, 'test-secret').email, 'ana@gmail.com');
});

test('el formato antiguo (email sin token) ya no sirve: no se puede suplantar a nadie', async () => {
    await addUser({ uid: 'adm', email: 'admin@x.com', role: 'admin', displayName: 'Admin' });
    const res = await google({ email: 'admin@x.com', uid: 'adm', displayName: 'Admin' });
    assert.equal(res.status, 401);
});

test('un token firmado con una clave que no es de Google se rechaza', async () => {
    const res = await google({ idToken: idToken({ email: 'admin@x.com' }, { key: keyB }) });
    assert.equal(res.status, 401);
});

test('un token con clave desconocida (kid), de otro proyecto, de otro emisor o caducado se rechaza', async () => {
    assert.equal((await google({ idToken: idToken({}, { kid: 'otro' }) })).status, 401);
    const wrongAud = jwt.sign({ email: 'a@b.com', email_verified: true }, keyA.privateKey.export({ type: 'pkcs8', format: 'pem' }),
        { algorithm: 'RS256', keyid: 'kidA', subject: 's', audience: 'otro-proyecto', issuer: `https://securetoken.google.com/${PROJECT_ID}`, expiresIn: '1h' });
    assert.equal((await google({ idToken: wrongAud })).status, 401);
    const wrongIss = jwt.sign({ email: 'a@b.com', email_verified: true }, keyA.privateKey.export({ type: 'pkcs8', format: 'pem' }),
        { algorithm: 'RS256', keyid: 'kidA', subject: 's', audience: PROJECT_ID, issuer: 'https://evil.example', expiresIn: '1h' });
    assert.equal((await google({ idToken: wrongIss })).status, 401);
    const expired = jwt.sign({ email: 'a@b.com', email_verified: true }, keyA.privateKey.export({ type: 'pkcs8', format: 'pem' }),
        { algorithm: 'RS256', keyid: 'kidA', subject: 's', audience: PROJECT_ID, issuer: `https://securetoken.google.com/${PROJECT_ID}`, expiresIn: -10 });
    assert.equal((await google({ idToken: expired })).status, 401);
});

test('un token sin email verificado, "alg none" o basura se rechaza', async () => {
    assert.equal((await google({ idToken: idToken({ email_verified: false }) })).status, 401);
    const none = jwt.sign({ email: 'admin@x.com', email_verified: true, sub: 's', aud: PROJECT_ID, iss: `https://securetoken.google.com/${PROJECT_ID}` }, '', { algorithm: 'none' });
    assert.equal((await google({ idToken: none })).status, 401);
    assert.equal((await google({ idToken: 'basura' })).status, 401);
    assert.equal((await google({})).status, 401);
});

test('un usuario existente conserva su rol (p. ej. admin) al entrar con Google', async () => {
    await addUser({ uid: 'adm-1', email: 'ana@gmail.com', role: 'admin', displayName: 'Ana' });
    const body = await (await google({ idToken: idToken() })).json();
    assert.equal(body.user.role, 'admin');
    assert.equal(body.user.uid, 'adm-1');
    assert.equal((await users()).length, 1);
});

test('JWT_SECRET: en producción sin secreto el servidor no arranca', () => {
    const { execFileSync } = require('node:child_process');
    assert.throws(() => execFileSync(process.execPath, ['-e', `require(${JSON.stringify(src('config', 'jwt.js'))})`],
        { env: { PATH: process.env.PATH, NODE_ENV: 'production' }, stdio: 'pipe' }));
    const out = execFileSync(process.execPath, ['-e', `console.log(require(${JSON.stringify(src('config', 'jwt.js'))}).JWT_SECRET)`],
        { env: { PATH: process.env.PATH, NODE_ENV: 'production', JWT_SECRET: 'abc' } }).toString().trim();
    assert.equal(out, 'abc');
});
