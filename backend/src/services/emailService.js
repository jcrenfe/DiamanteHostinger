const nodemailer = require('nodemailer');
const path = require('path');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'jcrenfe@gmail.com',
        pass: process.env.SMTP_PASS || 'qvnt yffg oxgq swag'
    },
    tls: {
        rejectUnauthorized: false
    }
});

function buildOrderEmailHtml(order, orderId) {
    const contactEmail = process.env.CONTACT_RECEIVER || 'jcrenfe@gmail.com';
    const customerName = order.customer_name || order.customer?.name || 'Cliente';
    const items = order.items || [];
    const total = parseFloat(order.total || 0).toFixed(2);

    const itemsRows = items.map(item => {
        const prodName = item.product?.name || item.name || 'Producto';
        const price = parseFloat(item.product?.price || item.price || 0).toFixed(2);
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

    const surchargeAmount = parseFloat(order.delivery_surchargeAmount || 0);
    const surchargeRow = surchargeAmount > 0 ? `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px dashed #EECDAB; color: #E67E22; font-style: italic; font-size: 14px;">
                🚚 Incremento por desplazamiento
            </td>
            <td style="padding: 12px 0; border-bottom: 1px dashed #EECDAB; color: #E67E22; font-weight: bold; text-align: right; font-size: 14px;">
                ${surchargeAmount.toFixed(2)}€
            </td>
        </tr>
    ` : '';

    const personalizationBlock = order.delivery_message ? `
        <div style="background-color: #FFF9F2; border-left: 4px solid #E67E22; padding: 16px; margin: 24px 0; border-radius: 6px;">
            <p style="margin: 0 0 6px 0; color: #8B4513; font-weight: bold; font-size: 13px; text-transform: uppercase;">💌 Mensaje para la Tarjeta:</p>
            <p style="margin: 0; color: #5D4037; font-style: italic; font-size: 14px;">"${order.delivery_message}"</p>
        </div>
    ` : '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Confirmación de Pedido - Desayuno con Diamante</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDF8F0; font-family: 'Montserrat', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FDF8F0; padding: 30px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(139,69,19,0.08); border: 1px solid #F0E2D1;">
                    <tr>
                        <td align="center" style="background-color: #8B4513; padding: 25px 20px; text-align: center;">
                            <h1 style="color: #FDF8F0; margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 2px;">Desayuno con Diamante</h1>
                            <p style="color: #FDF8F0; margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">Confirmación de Pedido</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 35px 30px;">
                            <h2 style="color: #8B4513; font-size: 22px; margin-top: 0;">¡Gracias por tu pedido, ${customerName}!</h2>
                            <p style="color: #5D4037; font-size: 15px; line-height: 1.6;">Hemos recibido correctamente tu pedido y estamos procesándolo con todo nuestro cariño y productos frescos del día.</p>
                            
                            <div style="background-color: #FDF8F0; border: 1px solid #F0E2D1; padding: 12px 18px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                                <span style="color: #5D4037; font-size: 13px;">Número de Pedido:</span>
                                <strong style="color: #8B4513; font-size: 16px; margin-left: 8px;">#${orderId}</strong>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FDF8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #F0E2D1;">
                                <tr>
                                    <td>
                                        <h3 style="color: #8B4513; font-size: 15px; margin: 0 0 12px 0;">🚚 Datos de Entrega</h3>
                                        <p style="margin: 0 0 6px 0; color: #1D1C1B; font-size: 14px;"><strong>Dirección:</strong> ${order.delivery_address || '-'}, ${order.delivery_city || ''} (${order.delivery_zip || ''})</p>
                                        <p style="margin: 0 0 6px 0; color: #1D1C1B; font-size: 14px;"><strong>Fecha:</strong> ${order.delivery_date || '-'}</p>
                                        <p style="margin: 0; color: #1D1C1B; font-size: 14px;"><strong>Tramo horario:</strong> ${order.delivery_timeSlot || 'Por determinar'}</p>
                                    </td>
                                </tr>
                            </table>

                            ${personalizationBlock}

                            <h3 style="color: #8B4513; font-size: 16px; margin: 24px 0 12px 0;">🛍️ Resumen del Pedido</h3>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                ${itemsRows}
                                ${surchargeRow}
                                <tr>
                                    <td style="padding: 16px 0 0 0; color: #8B4513; font-size: 18px; font-weight: bold;">Total Pagado</td>
                                    <td style="padding: 16px 0 0 0; color: #8B4513; font-size: 20px; font-weight: bold; text-align: right;">${total}€</td>
                                </tr>
                            </table>

                            <div style="border-top: 1px solid #F0E2D1; margin-top: 30px; padding-top: 20px; text-align: center; color: #5D4037; font-size: 13px;">
                                Si tienes cualquier duda sobre tu pedido, puedes escribirnos a <a href="mailto:${contactEmail}" style="color: #E67E22; text-decoration: none;">${contactEmail}</a>.
                            </div>
                        </td>
                    </tr>
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

async function sendOrderConfirmationEmail(orderData, orderId) {
    const recipientEmail = orderData.customer_email || orderData.customer?.email;

    if (!recipientEmail) {
        console.warn('⚠️ No email provided for order confirmation:', orderId);
        return false;
    }

    const htmlContent = buildOrderEmailHtml(orderData, orderId);

    const mailOptions = {
        from: `"Desayuno con Diamante" <${process.env.SMTP_USER || 'jcrenfe@gmail.com'}>`,
        to: recipientEmail,
        subject: `Confirmación de Pedido #${orderId} - Desayuno con Diamante`,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Correo de confirmación de pedido enviado a ${recipientEmail}`);
        return true;
    } catch (err) {
        console.error('❌ Error al enviar correo de confirmación:', err.message);
        return false;
    }
}

async function sendSlotConflictRefundEmail(order, refunded = true) {
    const to = order.customer_email;
    if (!to) return false;
    const fecha = `${order.delivery_date} a las ${order.delivery_timeSlot}`;
    try {
        await transporter.sendMail({
            from: `"Desayuno con Diamante" <${process.env.SMTP_USER || 'jcrenfe@gmail.com'}>`,
            to,
            subject: `Tu pedido #${order.id} no ha podido reservarse - Desayuno con Diamante`,
            html: `<p>Hola ${order.customer_name || ''},</p>
<p>Lamentablemente la hora de entrega que elegiste (${fecha}) fue reservada por otro cliente mientras completabas el pago, por lo que no podemos atender tu pedido en ese horario.</p>
<p>${refunded ? 'Hemos <strong>reembolsado el importe completo</strong> a tu tarjeta (puede tardar unos días en reflejarse).' : 'Estamos gestionando el reembolso del importe; nos pondremos en contacto contigo.'}</p>
<p>Puedes volver a hacer tu pedido eligiendo otra hora. Disculpa las molestias.</p>`
        });
        return true;
    } catch (err) {
        console.error('❌ Error al enviar correo de conflicto de horario:', err.message);
        return false;
    }
}

module.exports = {
    transporter,
    sendSlotConflictRefundEmail,
    sendOrderConfirmationEmail
};
