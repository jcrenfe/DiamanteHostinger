const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const admin = require('firebase-admin');

// Redsys Test Configuration (from redsys.txt)
const MERCHANT_KEY = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7'; // FIXED: 0 instead of O
const MERCHANT_FUC = '999008881';
const TERMINAL = '1';
const REDSYS_URL = 'https://sis-t.redsys.es:25443/sis/realizarPago';

const { createRedsysAPI, SANDBOX_URLS, redirectInputFormatter, isResponseCodeOk } = require('redsys-easy');

// Configuración de redsys-easy base
// Se inicializará usando SANDBOX_URLS para test

router.post('/create-payment', (req, res) => {
    const { amount, orderId, description } = req.body;

    if (!amount || !orderId) {
        return res.status(400).json({ error: "Amount and OrderId are required" });
    }

    // Amount string e.g. "145" for 1.45€
    const amountCents = Math.round(parseFloat(amount) * 100).toString();

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
        merchantURL: process.env.REDSYS_NOTIFY_URL || "http://localhost:3000/api/payment/notify",
        successURL: process.env.REDSYS_SUCCESS_URL || "http://localhost:4200/checkout/success",
        errorURL: process.env.REDSYS_FAIL_URL || "http://localhost:4200/checkout/fail",
        productDescription: description || "Desayuno con Diamante"
    });

    // Redsys raw parameters
    const paymentForm = createRedirectForm(formattedParams);

    res.json({
        signatureVersion: "HMAC_SHA256_V1",
        merchantParameters: paymentForm.body.Ds_MerchantParameters,
        signature: paymentForm.body.Ds_Signature,
        url: paymentForm.url
    });
});

// Webhook / Notification URL
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

        // Verify the signature
        const params = processRestNotification(req.body);
        console.log('✅ Signature Verified. Payment Params:', params);

        const orderId = params.Ds_Order;
        const isAuthorized = isResponseCodeOk(params.Ds_Response);

        // Update database
        const db = admin.firestore();
        const ordersRef = db.collection('pedidos');
        // Redsys ds order is padded or formatted as the id we gave it
        const snapshot = await ordersRef.where('redsysOrderId', '==', orderId).get();

        if (snapshot.empty) {
            console.error(`❌ Order with ID ${orderId} not found in DB`);
            // Redsys expects a 200 OK so it doesn't retry infinitely
            return res.status(200).send('OK but Order Not Found');
        }

        const doc = snapshot.docs[0];
        await doc.ref.update({
            status: isAuthorized ? 'paid' : 'failed',
            paymentResponseCode: params.Ds_Response,
            authorizationCode: params.Ds_AuthorisationCode || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Order ${orderId} updated successfully to ${isAuthorized ? 'paid' : 'failed'}`);

        // We MUST reply HTTP 200 OK for Redsys to stop repeating the hook
        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Redsys Verify Error:', error.message);
        res.status(400).send('Invalid Signature or Verify Failed');
    }
});

module.exports = router;
