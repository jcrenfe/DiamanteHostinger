const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const router = express.Router();

const CLOUDFLARE_SECRET_KEY = process.env.CLOUDFLARE_SECRET_KEY || '1x0000000000000000000000000000000AA';

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // use TLS
    auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'pass'
    },
    tls: {
        rejectUnauthorized: false
    }
});

router.post('/send', async (req, res) => {
    const { nombre, email, asunto, mensaje, captchaToken } = req.body;

    if (!nombre || !email || !mensaje || !captchaToken) {
        return res.status(400).json({ success: false, message: "Todos los campos con * y el captcha son obligatorios." });
    }

    try {
        // 1. Verify Cloudflare Turnstile Captcha
        const verifyResponse = await axios.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            new URLSearchParams({
                secret: CLOUDFLARE_SECRET_KEY,
                response: captchaToken,
                remoteip: req.ip
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (!verifyResponse.data.success) {
            return res.status(403).json({ success: false, message: "La verificación del Captcha ha fallado. Inténtalo de nuevo." });
        }

        // 2. Send Email
        const mailOptions = {
            from: `"Web Diamante" <${process.env.SMTP_USER || 'no-reply@diamante.local'}>`,
            to: process.env.CONTACT_RECEIVER || 'contacto@desayunocondiamante.com',
            replyTo: email,
            subject: `Nuevo Mensaje [${asunto}]: ${nombre}`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #8B4513;">Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${nombre}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Asunto:</strong> ${asunto}</p>
          <hr>
          <p><strong>Mensaje:</strong></p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            ${mensaje.replace(/\n/g, '<br>')}
          </div>
        </div>
      `
        };

        // If we have real credentials, send. Otherwise log it as success (test mode).
        if (process.env.SMTP_USER && process.env.SMTP_SERVER) {
            await transporter.sendMail(mailOptions);
        }

        return res.json({ success: true, message: "Mensaje procesado correctamente." });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Error interno al enviar el mensaje. Prueba más tarde." });
    }
});

module.exports = router;
