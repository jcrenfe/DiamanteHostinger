const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

// Carga manual de variables para evitar errores del CLI de Firebase en Windows
require('dotenv').config({ path: require('path').resolve(__dirname, 'variables.env') });

// Forzar que el Admin SDK use Firestore de PRODUCCIÓN incluso desde el emulador,
// porque el frontend no usa el emulador de Firestore (necesita Java).
delete process.env.FIRESTORE_EMULATOR_HOST;

// Initialize Firebase Admin once
admin.initializeApp();

// Configure Global Options (Region)
setGlobalOptions({ region: "europe-southwest1" });

// 1. Webhooks & Legacy REST API (mantiene el soporte para el webhook de Redsys)
exports.api = require("firebase-functions/v2/https").onRequest({
    maxInstances: 10,
    cors: true 
}, (req, res) => {
    // Lazy load the Express app
    const app = require("./src/app");
    return app(req, res);
});

const onCall = require("firebase-functions/v2/https").onCall;
const HttpsError = require("firebase-functions/v2/https").HttpsError;

// 2. HTTPS Callable Functions for Frontend integration
const callableOptions = {
    cors: true,
    maxInstances: 10
};

/**
 * Iniciación de Pago con Stripe Checkout
 */
exports.createPayment = onCall(callableOptions, async (request) => {
    try {
        const { amount, orderId, description } = request.data;
        if (!amount || !orderId) throw new HttpsError('invalid-argument', 'Amount and OrderId balance required');

        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey || stripeKey.includes('REEMPLAZAR')) {
            throw new HttpsError('failed-precondition', 'La clave secreta de Stripe (STRIPE_SECRET_KEY) no está configurada en variables.env');
        }

        const stripe = require('stripe')(stripeKey);

        // Convertir importe a céntimos para Stripe (EUR)
        const amountCents = Math.round(parseFloat(amount) * 100);

        // Detectar de forma dinámica el dominio origen (local vs producción)
        let origin = request.rawRequest?.headers?.origin || request.rawRequest?.headers?.referer;
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

        return {
            clientSecret: session.client_secret,
            sessionId: session.id
        };
    } catch (error) {
        console.error("Error en createPayment (Stripe):", error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Envío de Formulario de Contacto
 */
exports.sendContact = onCall(callableOptions, async (request) => {
    try {
        const { nombre, email, asunto, mensaje, captchaToken } = request.data;
        
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_SERVER,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            tls: { rejectUnauthorized: false }
        });

        const mailOptions = {
            from: `"Web Diamante" <${process.env.SMTP_USER}>`,
            to: process.env.CONTACT_RECEIVER,
            replyTo: email,
            subject: `Nuevo Mensaje [${asunto}]: ${nombre}`,
            html: `<h2>Nuevo mensaje de contacto</h2><p><strong>De:</strong> ${nombre} (${email})</p><p><strong>Mensaje:</strong></p><div>${mensaje}</div>`
        };

        if (process.env.SMTP_SERVER && process.env.SMTP_SERVER !== 'smtp.example.com') {
            await transporter.sendMail(mailOptions);
        }

        return { success: true };
    } catch (error) {
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Optimización de Rutas Logísticas
 */
exports.optimizeLogistics = onCall(callableOptions, async (request) => {
    try {
        const { orders, drivers = 1 } = request.data;
        // Mock simple de optimización por ahora
        return {
            success: true,
            routes: Array.from({ length: drivers }, (_, i) => ({
                driverId: i + 1,
                orders: orders.slice(i * Math.ceil(orders.length / drivers), (i + 1) * Math.ceil(orders.length / drivers)),
                totalTime: 3600,
                totalDistance: 15000,
                probabilityOfSuccess: 95
            }))
        };
    } catch (error) {
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Envío Masivo de Campañas
 */
exports.sendCampaign = onCall(callableOptions, async (request) => {
    try {
        const campaignData = request.data;
        const recipients = campaignData?.recipients || [];

        const { sendCampaignEmails } = require('./src/services/emailService');
        const result = await sendCampaignEmails(campaignData, recipients);

        return result;
    } catch (error) {
        throw new HttpsError('internal', error.message);
    }
});

const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");

/**
 * Trigger automático cuando un pedido cambia a estado 'paid'
 */
exports.onOrderPaid = onDocumentUpdated({ document: "pedidos/{orderId}", database: "diamante-bd" }, async (event) => {
    try {
        const after = event.data.after.data();
        const orderId = event.params.orderId;

        if (after && after.status === 'paid' && !after.emailSent) {
            const { sendOrderConfirmationEmail } = require('./src/services/emailService');
            const sent = await sendOrderConfirmationEmail(after, orderId);
            if (sent) {
                await event.data.after.ref.update({
                    emailSent: true,
                    emailSentAt: FieldValue.serverTimestamp()
                });
            }
        }
    } catch (error) {
    }
});

/**
 * Confirmación directa de pago de pedido desde la vista de Éxito de la web (Frontend)
 */
exports.confirmOrderPayment = onCall(callableOptions, async (request) => {
    try {
        const { orderId, sessionId } = request.data;

        if (!orderId) throw new HttpsError('invalid-argument', 'orderId es requerido');

        const db = getFirestore("diamante-bd");
        const ordersRef = db.collection('pedidos');

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

        if (!orderDoc) {
            return { success: false, reason: 'Order not found' };
        }

        const orderData = orderDoc.data();

        // Update status to paid if pending
        if (orderData.status !== 'paid') {
            await orderDoc.ref.update({
                status: 'paid',
                stripeSessionId: sessionId || orderData.stripeSessionId || null,
                updatedAt: FieldValue.serverTimestamp()
            });
        }

        // Trigger rich email sending
        if (!orderData.emailSent) {
            const { sendOrderConfirmationEmail } = require('./src/services/emailService');
            const sent = await sendOrderConfirmationEmail(orderData, orderId);
            if (sent) {
                await orderDoc.ref.update({
                    emailSent: true,
                    emailSentAt: FieldValue.serverTimestamp()
                });
            }
            return { success: true, emailSent: sent };
        }

        return { success: true, emailSent: true, alreadySent: true };
    } catch (error) {
        console.error("❌ [TRAZA CONFIRMACIÓN ERROR]:", error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Consulta activa del estado del PaymentIntent de Stripe para detectar last_payment_error
 */
exports.checkStripePaymentStatus = onCall(callableOptions, async (request) => {
    try {
        const { orderId, sessionId } = request.data;
        if (!orderId || !sessionId) return { success: false, reason: 'orderId y sessionId son requeridos' };

        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey || stripeKey.includes('REEMPLAZAR')) {
            throw new HttpsError('failed-precondition', 'La clave secreta de Stripe no está configurada');
        }

        const stripe = require('stripe')(stripeKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent']
        });

        const pi = typeof session.payment_intent === 'object' ? session.payment_intent : null;
        if (pi && pi.last_payment_error) {
            const errorId = pi.last_payment_error.payment_method?.id || 
                            pi.last_payment_error.code || 
                            String(pi.last_payment_error.created || Date.now());

            const db = getFirestore("diamante-bd");
            const ordersRef = db.collection('pedidos');

            let orderDoc = null;
            let snapshot = await ordersRef.where('redsysOrderId', '==', String(orderId)).get();
            if (snapshot.empty) {
                snapshot = await ordersRef.where('redsysOrderId', '==', Number(orderId)).get();
            }
            if (!snapshot.empty) {
                orderDoc = snapshot.docs[0];
            } else {
                const docSnap = await ordersRef.doc(String(orderId)).get();
                if (docSnap.exists) orderDoc = docSnap;
            }

            if (orderDoc) {
                const orderData = orderDoc.data();
                if (orderData.status !== 'paid' && orderData.status !== 'cancelled') {
                    if (orderData.lastStripeErrorId !== errorId) {
                        const currentAttempts = (orderData.failedPaymentAttempts || 0) + 1;
                        const isMaxReached = currentAttempts >= 3;

                        const updateData = {
                            failedPaymentAttempts: currentAttempts,
                            lastStripeErrorId: errorId,
                            updatedAt: FieldValue.serverTimestamp()
                        };

                        if (isMaxReached) {
                            updateData.status = 'cancelled';
                            updateData.cancelReason = 'max_failed_attempts';
                            updateData.cancelledAt = FieldValue.serverTimestamp();
                        }

                        await orderDoc.ref.update(updateData);

                        return {
                            success: true,
                            hasError: true,
                            attempts: currentAttempts,
                            cancelled: isMaxReached
                        };
                    }
                }
            }
        }

        return { success: true, hasError: false };
    } catch (err) {
        throw new HttpsError('internal', err.message);
    }
});

/**
 * Registra un intento fallido de pago para un pedido (hasta un máximo de 3)
 */
exports.registerFailedPaymentAttempt = onCall(callableOptions, async (request) => {
    try {
        const { orderId } = request.data;
        if (!orderId) throw new HttpsError('invalid-argument', 'orderId es requerido');

        const db = getFirestore("diamante-bd");
        const ordersRef = db.collection('pedidos');

        let orderDoc = null;
        let snapshot = await ordersRef.where('redsysOrderId', '==', String(orderId)).get();
        if (snapshot.empty) {
            snapshot = await ordersRef.where('redsysOrderId', '==', Number(orderId)).get();
        }
        if (!snapshot.empty) {
            orderDoc = snapshot.docs[0];
        } else {
            const docSnap = await ordersRef.doc(String(orderId)).get();
            if (docSnap.exists) orderDoc = docSnap;
        }

        if (!orderDoc) {
            return { success: false, reason: 'Order not found' };
        }

        const orderData = orderDoc.data();
        if (orderData.status === 'paid' || orderData.status === 'cancelled') {
            return { success: false, status: orderData.status };
        }

        const currentAttempts = (orderData.failedPaymentAttempts || 0) + 1;
        const isMaxReached = currentAttempts >= 3;

        const updateData = {
            failedPaymentAttempts: currentAttempts,
            updatedAt: FieldValue.serverTimestamp()
        };

        if (isMaxReached) {
            updateData.status = 'cancelled';
            updateData.cancelReason = 'max_failed_attempts';
            updateData.cancelledAt = FieldValue.serverTimestamp();
        }

        await orderDoc.ref.update(updateData);

        return {
            success: true,
            attempts: currentAttempts,
            cancelled: isMaxReached,
            message: isMaxReached 
                ? 'Has alcanzado el número máximo de 3 intentos fallidos de pago. Tu pedido ha sido cancelado.'
                : `Intento de pago fallido (${currentAttempts}/3).`
        };
    } catch (err) {
        throw new HttpsError('internal', err.message);
    }
});




/**
 * Tarea programada en europe-west1: Revisa pedidos pendientes de pago sin respuesta, envía correo con enlace de pago y los cancela al caducar.
 */
exports.cleanExpiredPendingOrders = onSchedule({
    region: "europe-west1",
    schedule: "every 5 minutes",
    timeZone: "Europe/Madrid",
    maxInstances: 1
}, async (event) => {
    try {
        const timeoutMinutes = parseInt(process.env.PENDING_PAYMENT_TIMEOUT_MINUTES || '30');
        const db = getFirestore("diamante-bd");
        const ordersRef = db.collection('pedidos');

        const snap = await ordersRef.where('status', '==', 'pending').get();
        if (snap.empty) return;

        const now = new Date();
        const { sendPendingPaymentReminderEmail } = require('./src/services/emailService');

        for (const docSnap of snap.docs) {
            const order = docSnap.data();
            const orderId = docSnap.id;
            const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();

            const expirationDate = new Date(createdAt.getTime() + timeoutMinutes * 60 * 1000);
            const isExpired = now >= expirationDate;

            if (isExpired) {
                await docSnap.ref.update({
                    status: 'cancelled',
                    cancelReason: 'expirado_por_tiempo',
                    cancelledAt: FieldValue.serverTimestamp()
                });
            } else if (!order.reminderEmailSent) {
                let origin = process.env.STRIPE_SUCCESS_URL ? process.env.STRIPE_SUCCESS_URL.replace(/\/checkout\/success\/?$/, '') : 'https://diamante-f70f4.web.app';
                const recoveryUrl = `${origin}/checkout?orderId=${orderId}`;

                const expStr = expirationDate.toLocaleString('es-ES', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                const sent = await sendPendingPaymentReminderEmail(order, orderId, expStr, recoveryUrl);
                if (sent) {
                    await docSnap.ref.update({
                        reminderEmailSent: true,
                        reminderEmailSentAt: FieldValue.serverTimestamp()
                    });
                }
            }
        }
    } catch (err) {
        console.error("❌ Error en cleanExpiredPendingOrders:", err.message);
    }
});



