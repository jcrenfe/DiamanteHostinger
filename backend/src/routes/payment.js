const express = require('express');
const router = express.Router();
const { beginPayment, attachSession, releasePaymentHold, confirmStripePayment, registerFailedPayment, handleSessionExpired, notifyPaymentProblem } = require('../services/paymentFlow');
const { PAYMENT_HOLD_MINUTES } = require('../services/availability');

// POST /api/payment/create-payment - Crear sesión de pago de Stripe (Embedded Checkout) para un pedido
// ya guardado. Sirve para el pago desde el checkout y para volver a pagar desde el correo de pago pendiente.
// El importe es SIEMPRE el total guardado en el pedido (el que envíe el navegador se ignora).
router.post('/create-payment', async (req, res) => {
    const { orderId, description } = req.body || {};

    if (!orderId) {
        return res.status(400).json({ error: 'Falta el número de pedido.' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
        return res.status(503).json({ error: 'La pasarela de pago no está configurada.' });
    }

    let heldOrder = null;
    try {
        // Comprueba que la hora sigue libre y retiene la hora mientras dura el pago.
        const begin = await beginPayment(orderId);
        if (!begin.ok) {
            return res.status(begin.status).json({ error: begin.error, reason: begin.reason });
        }
        heldOrder = begin.order;
        if (!heldOrder) {
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        }

        const stripe = require('stripe')(stripeKey, { apiVersion: '2024-06-20' });
        const amountCents = Math.round(Number(heldOrder.total) * 100);

        let origin = req.headers?.origin || req.headers?.referer;
        if (origin) {
            origin = origin.replace(/\/$/, '');
        } else if (process.env.STRIPE_SUCCESS_URL) {
            origin = process.env.STRIPE_SUCCESS_URL.replace(/\/checkout\/success\/?$/, '');
        } else {
            origin = 'https://desayuno.thewayweb.com';
        }

        const returnUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`;

        const session = await stripe.checkout.sessions.create({
            ui_mode: 'embedded',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: description || "Desayuno con Diamante",
                        },
                        unit_amount: amountCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // Así el cliente no tiene que volver a escribir su email en la pasarela
            ...(heldOrder.customer_email ? { customer_email: heldOrder.customer_email } : {}),
            // La sesión caduca justo cuando termina la retención de la hora.
            expires_at: Math.floor(Date.now() / 1000) + PAYMENT_HOLD_MINUTES * 60,
            return_url: returnUrl,
            metadata: {
                orderId: orderId.toString()
            },
            payment_intent_data: {
                metadata: {
                    orderId: orderId.toString()
                }
            }
        });

        await attachSession(heldOrder, session.id);
        return res.json({ clientSecret: session.client_secret, sessionId: session.id });
    } catch (error) {
        console.error('❌ Error al crear sesión de Stripe:', error.message);
        if (heldOrder) {
            await releasePaymentHold(heldOrder).catch(() => {});
            // La pasarela no está disponible: el pedido queda pendiente de pago y se avisa al cliente
            // (una vez) con el enlace para pagarlo más tarde.
            await notifyPaymentProblem(heldOrder.id).catch((e) => console.error('❌ Aviso de pago pendiente:', e.message));
        }
        return res.status(500).json({ error: 'No se ha podido abrir la pasarela de pago. Te hemos enviado un correo para completar el pago más tarde.' });
    }
});

// Webhook para recibir notificaciones de eventos de Stripe
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // En producción nunca se aceptan avisos sin verificar su firma: sin un secreto real configurado
    // cualquiera podría enviar un "pago completado" falso.
    const secretConfigured = endpointSecret && !endpointSecret.includes('REEMPLAZAR');
    if (!secretConfigured && process.env.NODE_ENV === 'production') {
        console.error('❌ STRIPE_WEBHOOK_SECRET no configurado: aviso de Stripe rechazado.');
        return res.status(500).send('Webhook secret not configured');
    }

    if (!stripeKey) {
        return res.status(400).send('Stripe key missing');
    }

    const stripe = require('stripe')(stripeKey, { apiVersion: '2024-06-20' });
    let event;

    try {
        if (endpointSecret && !endpointSecret.includes('REEMPLAZAR')) {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } else {
            const payload = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
            event = JSON.parse(payload);
        }
    } catch (err) {
        console.error('❌ Webhook Signature Error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata ? session.metadata.orderId : null;

        if (orderId) {
            try {
                // Reconfirma la hora bajo bloqueo; si otro pedido pagado la ocupó, reembolsa automáticamente.
                const outcome = await confirmStripePayment({ stripe, session });
                console.log(`💳 Pago ${session.id} del pedido ${orderId}: ${outcome.result}`);
            } catch (dbError) {
                console.error('❌ Database error updating order:', dbError);
            }
        }
    } else if (event.type === 'checkout.session.expired') {
        // Sesión de pago caducada sin pagarse: el pedido sigue pendiente y se avisa al cliente con el enlace de pago
        try {
            const outcome = await handleSessionExpired(event.data.object);
            console.log(`⌛ Sesión ${event.data.object.id} caducada: ${outcome.result}`);
        } catch (err) {
            console.error('❌ Error procesando la caducidad de la sesión de pago:', err);
        }
    } else if (event.type === 'payment_intent.payment_failed' || event.type === 'charge.failed') {
        const obj = event.data.object;
        const orderId = obj.metadata ? obj.metadata.orderId : null;

        if (orderId) {
            try {
                // Cuenta el intento fallido; el pedido sigue pendiente de pago
                await registerFailedPayment(orderId);
            } catch (err) {
                console.error('❌ Error processing payment failure:', err);
            }
        }
    }

    res.status(200).json({ received: true });
});

module.exports = router;
