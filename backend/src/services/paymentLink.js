// Enlace del correo de "pago pendiente" para pagar un pedido ya creado (mismo número de pedido).
// Lleva una firma (HMAC) del número de pedido: sin ella no se pueden consultar los datos del pedido,
// así que no basta con conocer o adivinar un número para ver la dirección o el teléfono de un cliente.
const crypto = require('node:crypto');
const { JWT_SECRET } = require('../config/jwt');

const sign = (orderId) => crypto.createHmac('sha256', JWT_SECRET).update(`pago:${orderId}`).digest('base64url');

function isValidPaymentToken(orderId, token) {
    if (typeof token !== 'string' || !token) return false;
    const expected = Buffer.from(sign(orderId));
    const given = Buffer.from(token);
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** Web pública de la tienda: FRONTEND_URL o, si no está, el origen de STRIPE_SUCCESS_URL. */
function frontendUrl() {
    if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/$/, '');
    if (process.env.STRIPE_SUCCESS_URL) return new URL(process.env.STRIPE_SUCCESS_URL).origin;
    return 'https://desayuno.thewayweb.com';
}

const paymentUrl = (orderId) => `${frontendUrl()}/pagar/${encodeURIComponent(orderId)}?t=${sign(orderId)}`;

module.exports = { paymentUrl, isValidPaymentToken };
