// Contenido de los correos (módulo real, sin enviar nada: solo se construye el HTML).
require('./helpers/env');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { buildOrderEmailHtml, buildPaymentProblemEmailHtml } = require(path.resolve(__dirname, '..', 'src', 'services', 'emailService.js'));

const order = {
    id: '123456789012', customer_name: 'Ana <script>alert(1)</script>', customer_phone: '600123456',
    delivery_address: 'Plaza Mayor, 3', delivery_city: 'Valladolid', delivery_zip: '47001', delivery_addressExtra: '2º B',
    delivery_addressOriginal: 'Plaza mayo 3, 47001, Valladolid', delivery_date: '2099-03-03', delivery_timeSlot: '10:00',
    delivery_message: '¡Feliz cumpleaños!', delivery_surchargeAmount: 3, total: 41,
    items: [{ name: 'DESAYUNO', price: 35, quantity: 1 }, { name: 'GLOBO', price: 1.5, quantity: 2 }]
};

test('confirmación: datos de entrega, aviso de dirección corregida, líneas y "Total Pagado"; el texto del cliente va escapado', () => {
    const html = buildOrderEmailHtml(order);
    assert.match(html, /#123456789012/);
    assert.match(html, /Plaza Mayor, 3/);
    assert.match(html, /Hemos corregido tu dirección/);
    assert.match(html, /GLOBO<\/strong> x 2/);
    assert.match(html, /3\.00€/);
    assert.match(html, /Total Pagado/);
    assert.ok(!html.includes('<script>'), 'el nombre del cliente debe ir escapado');
    assert.match(html, /&lt;script&gt;/);
});

test('pago pendiente: botón con el enlace de pago, aviso de que la hora no está garantizada y "Total a pagar"', () => {
    const url = 'https://desayuno.thewayweb.com/pagar/123456789012?t=abc';
    const html = buildPaymentProblemEmailHtml(order, url);
    assert.ok(html.includes(`href="${url}"`));
    assert.match(html, /Completar el pago/);
    assert.match(html, /no queda garantizada/);
    assert.match(html, /Total a pagar/);
    assert.ok(!html.includes('Total Pagado'));
});
