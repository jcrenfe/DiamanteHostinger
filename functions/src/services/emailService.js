const nodemailer = require('nodemailer');
const path = require('path');

// Ruta al logo para incrustar en emails como adjunto inline
const LOGO_PATH = path.resolve(__dirname, '../../logo_email.png');

// Configuración de Nodemailer compartida
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password'
    },
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Genera la plantilla HTML maquetada con los colores y la estética de la marca "Desayuno con Diamante"
 */
function buildOrderEmailHtml(order, orderId) {
    const contactEmail = process.env.CONTACT_RECEIVER || 'contacto@desayunocondiamante.com';
    const customerName = order.customer?.name || 'Cliente';
    const items = order.items || [];
    const delivery = order.delivery || {};
    const total = parseFloat(order.total || 0).toFixed(2);

    const itemsRows = items.map(item => {
        const prodName = item.product?.name || 'Producto';
        const price = parseFloat(item.product?.price || 0).toFixed(2);
        const qty = item.quantity || 1;
        const subtotal = (price * qty).toFixed(2);
        return `
            <tr>
                <td style="padding: 12px 0; border-bottom: 1px dashed #EECDAB; color: #1D1C1B; font-size: 14px;">
                    <strong>${prodName}</strong> x ${qty}
                </td>
                <td style="padding: 12px 0; border-bottom: 1px dashed #EECDAB; color: #8B4513; font-weight: bold; text-align: right; font-size: 14px;">
                    ${subtotal}€
                </td>
            </tr>
        `;
    }).join('');

    const personalizationBlock = delivery.message ? `
        <div style="background-color: #FFF9F2; border-left: 4px solid #E67E22; padding: 16px; margin: 24px 0; border-radius: 6px;">
            <p style="margin: 0 0 6px 0; color: #8B4513; font-weight: bold; font-size: 13px; text-transform: uppercase;">💌 Mensaje para la Tarjeta:</p>
            <p style="margin: 0; color: #5D4037; font-style: italic; font-size: 14px;">"${delivery.message}"</p>
        </div>
    ` : '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de Pedido - Desayuno con Diamante</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDF8F0; font-family: 'Montserrat', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FDF8F0; padding: 30px 10px;">
        <tr>
            <td align="center">
                
                <!-- Main Card Container -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(139,69,19,0.08); border: 1px solid #F0E2D1;">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td align="center" style="background-color: #8B4513; padding: 25px 20px; text-align: center;">
                            <img src="cid:logo" alt="Desayuno con Diamante" style="max-width: 180px; max-height: 180px; display: block; margin-left: auto; margin-right: auto;" />
                            <p style="color: #FDF8F0; margin: 12px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9;">
                                Confirmación de Pedido
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 35px 30px;">
                            
                            <h2 style="color: #8B4513; font-family: 'Georgia', serif; font-size: 22px; margin-top: 0; margin-bottom: 12px;">
                                ¡Gracias por tu pedido, ${customerName}!
                            </h2>
                            <p style="color: #5D4037; font-size: 15px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
                                Hemos recibido correctamente tu pago y ya estamos preparando tu pedido con todo nuestro cariño y productos frescos del día.
                            </p>

                            <!-- Order Reference badge -->
                            <div style="background-color: #FDF8F0; border: 1px solid #F0E2D1; padding: 12px 18px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                                <span style="color: #5D4037; font-size: 13px;">Número de Pedido:</span>
                                <strong style="color: #8B4513; font-size: 16px; margin-left: 8px;">#${orderId}</strong>
                            </div>

                            <!-- Delivery Details Box -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FDF8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #F0E2D1;">
                                <tr>
                                    <td>
                                        <h3 style="color: #8B4513; font-size: 15px; margin: 0 0 12px 0; font-family: 'Georgia', serif;">
                                            🚚 Datos de Entrega
                                        </h3>
                                        <p style="margin: 0 0 6px 0; color: #1D1C1B; font-size: 14px;">
                                            <strong>Dirección:</strong> ${delivery.address || '-'}, ${delivery.city || ''} (${delivery.zip || ''})
                                        </p>
                                        <p style="margin: 0 0 6px 0; color: #1D1C1B; font-size: 14px;">
                                            <strong>Fecha:</strong> ${delivery.date || '-'}
                                        </p>
                                        <p style="margin: 0; color: #1D1C1B; font-size: 14px;">
                                            <strong>Tramo horario:</strong> ${delivery.timeSlot || 'Por determinar'}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            ${personalizationBlock}

                            <!-- Products Summary Table -->
                            <h3 style="color: #8B4513; font-size: 16px; margin: 24px 0 12px 0; font-family: 'Georgia', serif;">
                                🛍️ Resumen del Pedido
                            </h3>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                ${itemsRows}
                                <tr>
                                    <td style="padding: 16px 0 0 0; color: #8B4513; font-size: 18px; font-weight: bold; font-family: 'Georgia', serif;">
                                        Total Pagado
                                    </td>
                                    <td style="padding: 16px 0 0 0; color: #8B4513; font-size: 20px; font-weight: bold; text-align: right; font-family: 'Georgia', serif;">
                                        ${total}€
                                    </td>
                                </tr>
                            </table>

                            <!-- Footer note inside card -->
                            <div style="border-top: 1px solid #F0E2D1; margin-top: 30px; padding-top: 20px; text-align: center; color: #5D4037; font-size: 13px;">
                                Si tienes cualquier duda sobre tu pedido, puedes responder directamente a este correo o escribirnos a <a href="mailto:${contactEmail}" style="color: #E67E22; text-decoration: none;">${contactEmail}</a>.
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #FDF8F0; padding: 20px; text-align: center; color: #999999; font-size: 12px;">
                            © ${new Date().getFullYear()} Desayuno con Diamante. Todos los derechos reservados.
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
    `;
}

/**
 * Envía el correo de confirmación al cliente
 */
async function sendOrderConfirmationEmail(orderData, orderId) {
    const recipientEmail = orderData.customer?.email;

    if (!recipientEmail) {
        return false;
    }

    const htmlContent = buildOrderEmailHtml(orderData, orderId);

    const fs = require('fs');
    const attachments = [];
    if (fs.existsSync(LOGO_PATH)) {
        attachments.push({
            filename: 'logo.png',
            path: LOGO_PATH,
            cid: 'logo'
        });
    }

    const mailOptions = {
        from: `"Desayuno con Diamante" <${process.env.SMTP_USER || 'contacto@desayunocondiamante.com'}>`,
        to: recipientEmail,
        subject: `Confirmación de Pedido #${orderId} - Desayuno con Diamante`,
        html: htmlContent,
        attachments
    };

    try {
        if (process.env.SMTP_USER && !process.env.SMTP_USER.includes('example')) {
            await transporter.sendMail(mailOptions);
        }
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Genera la plantilla HTML maquetada para campañas de correo
 */
function buildCampaignEmailHtml(campaign) {
    const contactEmail = process.env.CONTACT_RECEIVER || 'contacto@desayunocondiamante.com';
    const header = campaign.header || 'Novedades de Desayuno con Diamante';
    const summary = campaign.summary || '';
    const message = (campaign.message || '').replace(/\n/g, '<br>');
    const cta = campaign.cta || 'Ver Ofertas';
    const ctaUrl = campaign.ctaUrl || 'https://desayunocondiamante.com';

    const summaryBlock = summary ? `
        <div style="background-color: #FFF9F2; border-left: 4px solid #E67E22; padding: 14px 18px; margin-bottom: 24px; border-radius: 6px; color: #5D4037; font-size: 14px; font-weight: bold;">
            ${summary}
        </div>
    ` : '';

    const imageBlock = campaign.image ? `
        <div style="text-align: center; margin: 20px 0;">
            <img src="${campaign.image}" alt="Imagen de Campaña" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);" />
        </div>
    ` : '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${header}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDF8F0; font-family: 'Montserrat', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FDF8F0; padding: 30px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(139,69,19,0.08); border: 1px solid #F0E2D1;">
                    <!-- Header Banner -->
                    <tr>
                        <td align="center" style="background-color: #8B4513; padding: 25px 20px; text-align: center;">
                            <img src="cid:logo" alt="Desayuno con Diamante" style="max-width: 160px; max-height: 160px; display: block; margin-left: auto; margin-right: auto;" />
                            <p style="color: #FDF8F0; margin: 12px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9;">
                                Campaña Especial
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 35px 30px;">
                            <h1 style="color: #8B4513; font-family: 'Georgia', serif; font-size: 24px; margin-top: 0; margin-bottom: 20px;">
                                ${header}
                            </h1>

                            ${summaryBlock}
                            ${imageBlock}

                            <div style="color: #5D4037; font-size: 15px; line-height: 1.7; margin-bottom: 30px;">
                                ${message}
                            </div>

                            <div style="text-align: center; margin-top: 35px; margin-bottom: 20px;">
                                <a href="${ctaUrl}" style="background-color: #E67E22; color: #FFFFFF !important; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 15px rgba(230, 126, 34, 0.3);">
                                    ${cta}
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #FDF8F0; padding: 25px; text-align: center; color: #999999; font-size: 12px; border-top: 1px solid #F0E2D1;">
                            <p style="margin: 0 0 8px 0;">© ${new Date().getFullYear()} Desayuno con Diamante. Todos los derechos reservados.</p>
                            <p style="margin: 0;">Para cualquier consulta escríbenos a <a href="mailto:${contactEmail}" style="color: #E67E22; text-decoration: none;">${contactEmail}</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

/**
 * Envía la campaña por correo a la lista de destinatarios seleccionados
 */
async function sendCampaignEmails(campaign, recipients) {
    if (!recipients || recipients.length === 0) {
        return { success: false, reason: 'No recipients' };
    }

    const htmlContent = buildCampaignEmailHtml(campaign);

    const fs = require('fs');
    const attachments = [];
    if (fs.existsSync(LOGO_PATH)) {
        attachments.push({
            filename: 'logo.png',
            path: LOGO_PATH,
            cid: 'logo'
        });
    }

    let sentCount = 0;
    for (const recipientEmail of recipients) {
        const mailOptions = {
            from: `"Desayuno con Diamante" <${process.env.SMTP_USER || 'contacto@desayunocondiamante.com'}>`,
            to: recipientEmail,
            subject: campaign.header,
            html: htmlContent,
            attachments
        };

        try {
            if (process.env.SMTP_USER && !process.env.SMTP_USER.includes('example')) {
                await transporter.sendMail(mailOptions);
            }
            sentCount++;
        } catch (err) {
        }
    }

    // Actualizar estado en Firestore si se recibió campaignId o id
    const cId = campaign.campaignId || campaign.id;
    if (cId) {
        try {
            const { getFirestore, FieldValue } = require("firebase-admin/firestore");
            const db = getFirestore("diamante-bd");
            await db.collection('campañas').doc(cId).update({
                sentCount: sentCount,
                status: 'completed',
                lastSentAt: FieldValue.serverTimestamp()
            });
        } catch (dbErr) {
        }
    }

    return { success: true, sentCount };
}

/**
 * Genera el correo de recordatorio de pago pendiente con enlace de recuperación y fecha futura de cancelación
 */
async function sendPendingPaymentReminderEmail(orderData, orderId, expirationDateFormatted, recoveryUrl) {
    const recipientEmail = orderData.customer?.email;

    if (!recipientEmail) {
        return false;
    }

    const contactEmail = process.env.CONTACT_RECEIVER || 'contacto@desayunocondiamante.com';
    const customerName = orderData.customer?.name || 'Cliente';
    const items = orderData.items || [];
    const delivery = orderData.delivery || {};
    const total = parseFloat(orderData.total || 0).toFixed(2);

    const itemsRows = items.map(item => {
        const prodName = item.product?.name || 'Producto';
        const price = parseFloat(item.product?.price || 0).toFixed(2);
        const qty = item.quantity || 1;
        const subtotal = (price * qty).toFixed(2);
        return `
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px dashed #EECDAB; color: #1D1C1B; font-size: 14px;">
                    <strong>${prodName}</strong> x ${qty}
                </td>
                <td style="padding: 10px 0; border-bottom: 1px dashed #EECDAB; color: #8B4513; font-weight: bold; text-align: right; font-size: 14px;">
                    ${subtotal}€
                </td>
            </tr>
        `;
    }).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Completa tu Pedido - Desayuno con Diamante</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDF8F0; font-family: 'Montserrat', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FDF8F0; padding: 30px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(139,69,19,0.08); border: 1px solid #F0E2D1;">
                    <!-- Header Banner -->
                    <tr>
                        <td align="center" style="background-color: #8B4513; padding: 25px 20px; text-align: center;">
                            <img src="cid:logo" alt="Desayuno con Diamante" style="max-width: 160px; max-height: 160px; display: block; margin-left: auto; margin-right: auto;" />
                            <p style="color: #FDF8F0; margin: 12px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9;">
                                Recordatorio de Pago
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 35px 30px;">
                            <h2 style="color: #8B4513; font-family: 'Georgia', serif; font-size: 22px; margin-top: 0; margin-bottom: 12px;">
                                Hola ${customerName}, ¡tu pedido está esperando por ti!
                            </h2>
                            <p style="color: #5D4037; font-size: 15px; line-height: 1.6; margin-top: 0; margin-bottom: 20px;">
                                Hemos registrado la reserva de tu pedido <strong>#${orderId}</strong>, pero aún no se ha completado el pago en la pasarela.
                            </p>

                            <!-- Timeout Alert Box -->
                            <div style="background-color: #FFF3CD; border-left: 4px solid #E67E22; padding: 16px; margin: 20px 0 24px 0; border-radius: 6px; color: #856404; font-size: 14px; line-height: 1.5;">
                                <strong>⏰ Límite de Reserva:</strong><br>
                                Si no completas el pago antes del <strong>${expirationDateFormatted}</strong>, el pedido se cancelará automáticamente y se liberará la hora reservada.
                            </div>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${recoveryUrl}" style="background-color: #E67E22; color: #FFFFFF !important; padding: 15px 36px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(230, 126, 34, 0.35);">
                                    👉 Completar el Pago de mi Pedido
                                </a>
                            </div>

                            <!-- Delivery Summary Box -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FDF8F0; border-radius: 12px; padding: 18px; margin-bottom: 24px; border: 1px solid #F0E2D1;">
                                <tr>
                                    <td>
                                        <h3 style="color: #8B4513; font-size: 15px; margin: 0 0 10px 0; font-family: 'Georgia', serif;">🚚 Datos de Entrega Reservados</h3>
                                        <p style="margin: 0 0 4px 0; color: #1D1C1B; font-size: 14px;"><strong>Dirección:</strong> ${delivery.address || '-'}, ${delivery.city || ''}</p>
                                        <p style="margin: 0 0 4px 0; color: #1D1C1B; font-size: 14px;"><strong>Fecha y Hora:</strong> ${delivery.date || '-'} - ${delivery.timeSlot || ''}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Products Table -->
                            <h3 style="color: #8B4513; font-size: 15px; margin: 20px 0 10px 0; font-family: 'Georgia', serif;">🛍️ Productos en tu Carrito</h3>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                ${itemsRows}
                                <tr>
                                    <td style="padding: 14px 0 0 0; color: #8B4513; font-size: 16px; font-weight: bold; font-family: 'Georgia', serif;">Total</td>
                                    <td style="padding: 14px 0 0 0; color: #8B4513; font-size: 18px; font-weight: bold; text-align: right; font-family: 'Georgia', serif;">${total}€</td>
                                </tr>
                            </table>

                            <div style="border-top: 1px solid #F0E2D1; margin-top: 30px; padding-top: 20px; text-align: center; color: #5D4037; font-size: 13px;">
                                Si tienes dudas, contáctanos en <a href="mailto:${contactEmail}" style="color: #E67E22; text-decoration: none;">${contactEmail}</a>.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const fs = require('fs');
    const attachments = [];
    if (fs.existsSync(LOGO_PATH)) {
        attachments.push({
            filename: 'logo.png',
            path: LOGO_PATH,
            cid: 'logo'
        });
    }

    const mailOptions = {
        from: `"Desayuno con Diamante" <${process.env.SMTP_USER || 'contacto@desayunocondiamante.com'}>`,
        to: recipientEmail,
        subject: `⚠️ Recordatorio: Completa el pago de tu pedido #${orderId}`,
        html: htmlContent,
        attachments
    };

    try {
        if (process.env.SMTP_USER && !process.env.SMTP_USER.includes('example')) {
            await transporter.sendMail(mailOptions);
        }
        return true;
    } catch (err) {
        return false;
    }
}

module.exports = {
    sendOrderConfirmationEmail,
    buildOrderEmailHtml,
    sendCampaignEmails,
    buildCampaignEmailHtml,
    sendPendingPaymentReminderEmail
};

