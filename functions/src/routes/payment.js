const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const admin = require('firebase-admin');

// Configuración de Redsys desde variables de entorno
const MERCHANT_KEY = process.env.MERCHANT_KEY || 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';
const MERCHANT_FUC = process.env.MERCHANT_FUC || '999008881';
const TERMINAL = process.env.MERCHANT_TERMINAL || '1';

const { createRedsysAPI, SANDBOX_URLS, redirectInputFormatter, isResponseCodeOk } = require('redsys-easy');

// Endpoint para crear sesión de pago en Stripe (REST)
router.post('/create-payment', async (req, res) => {
    const { amount, orderId, description } = req.body;

    if (!amount || !orderId) {
        return res.status(400).json({ error: "Amount and OrderId are required" });
    }

    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey || stripeKey.includes('REEMPLAZAR')) {
            return res.status(400).json({ error: 'STRIPE_SECRET_KEY no configurada' });
        }

        const stripe = require('stripe')(stripeKey);
        const amountCents = Math.round(parseFloat(amount) * 100);

        let origin = req.headers?.origin || req.headers?.referer;
        if (origin) {
            origin = origin.replace(/\/$/, '');
        } else if (process.env.STRIPE_SUCCESS_URL) {
            origin = process.env.STRIPE_SUCCESS_URL.replace(/\/checkout\/success\/?$/, '');
        } else {
            origin = 'https://diamante-f70f4.web.app';
        }

        const returnUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`;

        const session = await stripe.checkout.sessions.create({
            ui_mode: 'embedded_page',
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

        res.json({ clientSecret: session.client_secret, sessionId: session.id });
    } catch (error) {
        console.error('❌ Error al crear sesión de Stripe:', error.message);
        res.status(500).json({ error: error.message });
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

    const stripe = require('stripe')(stripeKey);
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

    const { getFirestore, FieldValue } = require('firebase-admin/firestore');
    const db = getFirestore("diamante-bd");
    const ordersRef = db.collection('pedidos');

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata ? session.metadata.orderId : null;

        if (orderId) {
            try {
                const { sendOrderConfirmationEmail } = require('../services/emailService');
                let orderDoc = null;
                let snapshot = await ordersRef.where('redsysOrderId', '==', String(orderId)).get();
                if (snapshot.empty) {
                    snapshot = await ordersRef.where('redsysOrderId', '==', Number(orderId)).get();
                }
                if (!snapshot.empty) {
                    orderDoc = snapshot.docs[0];
                } else {
                    const docSnap = await ordersRef.doc(String(orderId)).get();
                    if (docSnap.exists) {
                        orderDoc = docSnap;
                    }
                }

                if (orderDoc) {
                    const currentData = orderDoc.data();
                    await orderDoc.ref.update({
                        status: 'paid',
                        stripeSessionId: session.id,
                        stripePaymentIntent: session.payment_intent,
                        emailSent: true,
                        updatedAt: FieldValue.serverTimestamp()
                    });

                    if (!currentData.emailSent) {
                        await sendOrderConfirmationEmail(currentData, orderId);
                    }
                }
            } catch (dbError) {
            }
        }
    } else if (event.type === 'payment_intent.payment_failed' || event.type === 'charge.failed') {
        const obj = event.data.object;
        const orderId = obj.metadata ? obj.metadata.orderId : null;

        if (orderId) {
            try {
                let orderDoc = null;
                let snapshot = await ordersRef.where('redsysOrderId', '==', String(orderId)).get();
                if (snapshot.empty) {
                    snapshot = await ordersRef.where('redsysOrderId', '==', Number(orderId)).get();
                }
                if (!snapshot.empty) {
                    orderDoc = snapshot.docs[0];
                } else {
                    const docSnap = await ordersRef.doc(String(orderId)).get();
                    if (docSnap.exists) {
                        orderDoc = docSnap;
                    }
                }

                if (orderDoc) {
                    const data = orderDoc.data();
                    if (data.status !== 'paid' && data.status !== 'cancelled') {
                        const attempts = (data.failedPaymentAttempts || 0) + 1;
                        const isMaxReached = attempts >= 3;

                        const updateObj = {
                            failedPaymentAttempts: attempts,
                            updatedAt: FieldValue.serverTimestamp()
                        };

                        if (isMaxReached) {
                            updateObj.status = 'cancelled';
                            updateObj.cancelReason = 'max_failed_attempts';
                            updateObj.cancelledAt = FieldValue.serverTimestamp();
                        }

                        await orderDoc.ref.update(updateObj);
                    }
                }
            } catch (err) {
            }
        }
    }

    res.status(200).json({ received: true });
});

// Webhook / Notification URL legacy Redsys
router.post('/notify', async (req, res) => {
    if (!req.body || !req.body.Ds_Signature) {
        return res.status(400).send('Invalid Empty Payload');
    }

    try {
        const { processRestNotification } = createRedsysAPI({
            urls: SANDBOX_URLS,
            secretKey: MERCHANT_KEY
        });

        const params = processRestNotification(req.body);

        const orderId = params.Ds_Order;
        const isAuthorized = isResponseCodeOk(params.Ds_Response);

        const { getFirestore, FieldValue } = require('firebase-admin/firestore');
        const db = getFirestore("diamante-bd");
        const ordersRef = db.collection('pedidos');
        let snapshot = await ordersRef.where('redsysOrderId', '==', String(orderId)).get();
        if (snapshot.empty) {
            snapshot = await ordersRef.where('redsysOrderId', '==', Number(orderId)).get();
        }

        if (snapshot.empty) {
            return res.status(200).send('OK but Order Not Found');
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        if (isAuthorized) {
            await doc.ref.update({
                status: 'paid',
                paymentResponseCode: params.Ds_Response,
                authorizationCode: params.Ds_AuthorisationCode || null,
                updatedAt: FieldValue.serverTimestamp()
            });
        } else {
            const attempts = (data.failedPaymentAttempts || 0) + 1;
            const isMaxReached = attempts >= 3;

            const updateObj = {
                failedPaymentAttempts: attempts,
                paymentResponseCode: params.Ds_Response,
                updatedAt: FieldValue.serverTimestamp()
            };

            if (isMaxReached) {
                updateObj.status = 'cancelled';
                updateObj.cancelReason = 'max_failed_attempts';
                updateObj.cancelledAt = FieldValue.serverTimestamp();
            } else {
                updateObj.status = 'failed';
            }

            await doc.ref.update(updateObj);
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Redsys Verify Error:', error.message);
        res.status(400).send('Invalid Signature or Verify Failed');
    }
});

module.exports = router;
