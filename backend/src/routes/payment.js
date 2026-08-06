const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// Redsys Test Configuration
const MERCHANT_KEY = process.env.MERCHANT_KEY || 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';
const MERCHANT_FUC = process.env.MERCHANT_FUC || '999008881';
const TERMINAL = process.env.MERCHANT_TERMINAL || '1';

const { createRedsysAPI, SANDBOX_URLS, redirectInputFormatter, isResponseCodeOk } = require('redsys-easy');

// POST /api/payment/create-payment - Crear sesión de pago (Stripe o Redsys)
router.post('/create-payment', async (req, res) => {
    const { amount, orderId, description, gateway } = req.body;

    if (!amount || !orderId) {
        return res.status(400).json({ error: "Amount and OrderId are required" });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;

    // Si Stripe está configurado y no se solicita explícitamente Redsys, usamos Stripe Embedded Checkout
    if (stripeKey && (!gateway || gateway === 'stripe')) {
        try {
            const stripe = require('stripe')(stripeKey, { apiVersion: '2024-06-20' });
            const amountCents = Math.round(parseFloat(amount) * 100);

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

            return res.json({ clientSecret: session.client_secret, sessionId: session.id });
        } catch (error) {
            console.error('❌ Error al crear sesión de Stripe:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    // Redsys Fallback / Redirection Form
    try {
        const { createRedirectForm } = createRedsysAPI({
            urls: SANDBOX_URLS,
            secretKey: MERCHANT_KEY
        });

        const formattedParams = redirectInputFormatter({
            amount: parseFloat(amount),
            order: orderId.toString().padStart(4, '0'),
            merchantCode: MERCHANT_FUC,
            currency: 'EUR',
            transactionType: '0',
            terminal: TERMINAL,
            merchantURL: process.env.REDSYS_NOTIFY_URL || "https://api.thewayweb.com/api/payment/notify",
            successURL: process.env.REDSYS_SUCCESS_URL || "https://desayuno.thewayweb.com/checkout/success",
            errorURL: process.env.REDSYS_FAIL_URL || "https://desayuno.thewayweb.com/checkout/fail",
            productDescription: description || "Desayuno con Diamante"
        });

        const paymentForm = createRedirectForm(formattedParams);

        return res.json({
            signatureVersion: "HMAC_SHA256_V1",
            merchantParameters: paymentForm.body.Ds_MerchantParameters,
            signature: paymentForm.body.Ds_Signature,
            url: paymentForm.url
        });
    } catch (err) {
        console.error('❌ Error al crear formulario de Redsys:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Webhook para recibir notificaciones de eventos de Stripe
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
                const order = await prisma.order.findFirst({
                    where: { redsysOrderId: String(orderId) }
                }) || await prisma.order.findUnique({
                    where: { id: String(orderId) }
                });

                if (order) {
                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            status: 'paid',
                            stripeSessionId: session.id,
                            stripePaymentIntent: session.payment_intent,
                            updatedAt: new Date()
                        }
                    });
                }
            } catch (dbError) {
                console.error('❌ Database error updating order:', dbError);
            }
        }
    } else if (event.type === 'payment_intent.payment_failed' || event.type === 'charge.failed') {
        const obj = event.data.object;
        const orderId = obj.metadata ? obj.metadata.orderId : null;

        if (orderId) {
            try {
                const order = await prisma.order.findFirst({
                    where: { redsysOrderId: String(orderId) }
                }) || await prisma.order.findUnique({
                    where: { id: String(orderId) }
                });

                if (order && order.status !== 'paid' && order.status !== 'cancelled') {
                    const attempts = (order.failedPaymentAttempts || 0) + 1;
                    const isMaxReached = attempts >= 3;

                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            failedPaymentAttempts: attempts,
                            status: isMaxReached ? 'cancelled' : 'failed',
                            updatedAt: new Date()
                        }
                    });
                }
            } catch (err) {
                console.error('❌ Error processing payment failure:', err);
            }
        }
    }

    res.status(200).json({ received: true });
});

// Redsys Webhook / Notification URL
router.post('/notify', async (req, res) => {
    console.log('🔔 Redsys Notification Received');

    if (!req.body || !req.body.Ds_Signature) {
        return res.status(400).send('Invalid Empty Payload');
    }

    try {
        const { processRestNotification } = createRedsysAPI({
            urls: SANDBOX_URLS,
            secretKey: MERCHANT_KEY
        });

        const params = processRestNotification(req.body);
        console.log('✅ Signature Verified. Payment Params:', params);

        const orderId = params.Ds_Order;
        const isAuthorized = isResponseCodeOk(params.Ds_Response);

        const order = await prisma.order.findFirst({
            where: { redsysOrderId: String(orderId) }
        });

        if (!order) {
            console.error(`❌ Order with ID ${orderId} not found in DB`);
            return res.status(200).send('OK but Order Not Found');
        }

        await prisma.order.update({
            where: { id: order.id },
            data: {
                status: isAuthorized ? 'paid' : 'failed',
                lastStripeErrorId: params.Ds_AuthorisationCode || null,
                updatedAt: new Date()
            }
        });

        console.log(`✅ Order ${orderId} updated successfully to ${isAuthorized ? 'paid' : 'failed'}`);
        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Redsys Verify Error:', error.message);
        res.status(400).send('Invalid Signature or Verify Failed');
    }
});

module.exports = router;
