// Servicios externos simulados para las pruebas: Google Maps (axios), Stripe y correo.
// La base de datos NO se simula: las pruebas usan una base real "*_test" (ver env.js y db.js).
require('./env');
const path = require('node:path');
const axios = require('axios');

const src = (...p) => path.resolve(__dirname, '..', '..', 'src', ...p);
const stubModule = (file, exports) => {
    require.cache[file] = { id: file, filename: file, loaded: true, exports, children: [], paths: [] };
};

// ---------------------------------------------------------------- correo
const emails = { confirmations: [], refunds: [], paymentProblems: [] };
stubModule(src('services', 'emailService.js'), {
    transporter: { sendMail: async () => ({ simulated: true }) },
    sendOrderConfirmationEmail: async (order) => { emails.confirmations.push({ id: order.id, order }); return true; },
    sendPaymentProblemEmail: async (order, url) => { emails.paymentProblems.push({ id: order.id, url, order }); return true; },
    sendSlotConflictRefundEmail: async (order, refunded) => { emails.refunds.push({ id: order.id, refunded }); return true; }
});

// Cualquier otro envío con nodemailer (p. ej. campañas) tampoco sale a la red
const sentMails = [];
stubModule(require.resolve('nodemailer'), {
    createTransport: () => ({ sendMail: async (mail) => { sentMails.push(mail); return { simulated: true }; } })
});

// ---------------------------------------------------------------- Stripe
// Se usa el módulo real (para firmar y verificar avisos del webhook) sustituyendo solo las llamadas a la API.
const RealStripe = require('stripe');
const stripe = { sessions: [], refunds: [], sessionShouldFail: false, refundShouldFail: false, idempotency: new Map() };
const fakeStripe = (key, opts) => {
    const s = RealStripe(key, opts);
    s.checkout.sessions.create = async (params) => {
        if (stripe.sessionShouldFail) throw new Error('Stripe no disponible');
        stripe.sessions.push(params);
        return { id: `cs_test_${stripe.sessions.length}`, client_secret: `secret_${stripe.sessions.length}` };
    };
    s.refunds.create = async (params, options = {}) => {
        if (stripe.refundShouldFail) throw new Error('Stripe no disponible');
        if (stripe.idempotency.has(options.idempotencyKey)) return stripe.idempotency.get(options.idempotencyKey);
        const refund = { id: `re_test_${stripe.refunds.length + 1}`, params, options };
        stripe.refunds.push(refund);
        stripe.idempotency.set(options.idempotencyKey, refund);
        return refund;
    };
    return s;
};
Object.assign(fakeStripe, RealStripe);
stubModule(require.resolve('stripe'), fakeStripe);
const signWebhook = (payload) => RealStripe('sk_test_dummy').webhooks.generateTestHeaderString({
    payload, secret: process.env.STRIPE_WEBHOOK_SECRET
});

// ---------------------------------------------------------------- Google Maps
// Geocoding: por defecto localiza la dirección escrita tal cual (calle, número, CP y ciudad).
// Rutas: tiempo y distancia configurables (maps.route) o una función por pareja (maps.matrix).
const maps = {
    geocodeStatus: 'OK',      // 'OK' | 'ZERO_RESULTS' | 'REQUEST_DENIED'...
    geocodeResult: null,      // resultado fijo (sustituye al calculado a partir de la dirección)
    route: { minutes: 10, km: 5 },
    matrix: null,             // (i, j) => { minutes, km } para la matriz de la ruta de reparto
    routeFails: false
};

function geocodeFromAddress(address) {
    const [street = '', zip = '', city = ''] = String(address).split(',').map(s => s.trim());
    const m = /^(.*?)[\s,]+(\d+[A-Za-z]?)$/.exec(street);
    const route = m ? m[1] : street;
    const number = m ? m[2] : null;
    return {
        formatted_address: `${route}, ${number || ''}, ${zip} ${city}, España`.replace(/ ,/g, ','),
        types: number ? ['street_address'] : ['route'],
        address_components: [
            ...(number ? [{ long_name: number, types: ['street_number'] }] : []),
            { long_name: route, types: ['route'] },
            { long_name: city, types: ['locality', 'political'] },
            { long_name: zip, types: ['postal_code'] }
        ],
        geometry: { location: { lat: 41.65, lng: -4.72 } }
    };
}

axios.get = async (url, config = {}) => {
    if (!String(url).includes('geocode')) throw new Error(`Petición GET no simulada: ${url}`);
    if (maps.geocodeStatus !== 'OK') return { data: { status: maps.geocodeStatus, results: [] } };
    return { data: { status: 'OK', results: [maps.geocodeResult || geocodeFromAddress(config.params?.address)] } };
};

axios.post = async (url, body = {}) => {
    if (!String(url).includes('computeRouteMatrix')) throw new Error(`Petición POST no simulada: ${url}`);
    if (maps.routeFails) { const e = new Error('Routes API no disponible'); e.response = { data: { error: { status: 'UNAVAILABLE' } } }; throw e; }
    const rows = [];
    body.origins.forEach((_, i) => body.destinations.forEach((__, j) => {
        const r = maps.matrix ? maps.matrix(i, j) : (i === j && body.origins.length > 1 ? { minutes: 0, km: 0 } : maps.route);
        rows.push({ originIndex: i, destinationIndex: j, distanceMeters: Math.round(r.km * 1000), duration: `${Math.round(r.minutes * 60)}s`, condition: 'ROUTE_EXISTS' });
    }));
    return { data: rows };
};

function resetStubs() {
    emails.confirmations.length = 0;
    emails.refunds.length = 0;
    emails.paymentProblems.length = 0;
    sentMails.length = 0;
    stripe.sessions.length = 0;
    stripe.refunds.length = 0;
    stripe.refundShouldFail = false;
    stripe.sessionShouldFail = false;
    stripe.idempotency.clear();
    Object.assign(maps, { geocodeStatus: 'OK', geocodeResult: null, route: { minutes: 10, km: 5 }, matrix: null, routeFails: false });
}

module.exports = { src, emails, sentMails, stripe, maps, signWebhook, resetStubs };
