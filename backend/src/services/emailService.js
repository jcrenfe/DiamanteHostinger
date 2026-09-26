const nodemailer = require('nodemailer');
const path = require('path');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Logotipo incrustado (cid) para que se vea aunque el cliente de correo bloquee imágenes remotas
const LOGO_CID = 'logo-diamante';
const logoAttachment = () => ({ filename: 'logo.png', path: path.join(__dirname, '..', '..', 'assets', 'email-logo.png'), contentType: 'image/png', cid: LOGO_CID });
const fromAddress = () => `"Desayuno con Diamante" <${process.env.SMTP_USER}>`;
const contactEmail = () => process.env.CONTACT_RECEIVER || 'jcrenfe@gmail.com';

/** Escapa el texto escrito por el cliente antes de insertarlo en el HTML del correo. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (parseFloat(n || 0)).toFixed(2);

/** Diseño común de todos los correos: logotipo, subtítulo de la cabecera, contenido y pie. */
function emailLayout({ title, subtitle, body }) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${esc(title)} - Desayuno con Diamante</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDF8F0; font-family: 'Montserrat', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FDF8F0; padding: 30px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(139,69,19,0.08); border: 1px solid #F0E2D1;">
                    <tr>
                        <td align="center" style="background-color: #8B4513; padding: 25px 20px; text-align: center;">
                            <img src="cid:${LOGO_CID}" alt="Desayuno con Diamante" width="120" height="120" style="display: block; margin: 0 auto; border: 0; border-radius: 60px;">
                            <p style="color: #FDF8F0; margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">${esc(subtitle)}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 35px 30px;">
                            ${body}
                            <div style="border-top: 1px solid #F0E2D1; margin-top: 30px; padding-top: 20px; text-align: center; color: #5D4037; font-size: 13px;">
                                Si tienes cualquier duda sobre tu pedido, puedes escribirnos a <a href="mailto:${contactEmail()}" style="color: #E67E22; text-decoration: none;">${contactEmail()}</a>.
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
</html>`;
}

const orderNumberBlock = (orderId) => `
    <div style="background-color: #FDF8F0; border: 1px solid #F0E2D1; padding: 12px 18px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
        <span style="color: #5D4037; font-size: 13px;">Número de Pedido:</span>
        <strong style="color: #8B4513; font-size: 16px; margin-left: 8px;">#${esc(orderId)}</strong>
    </div>`;

/** Datos de entrega (dirección tal como la guardó el pedido, piso, teléfono, fecha y hora). */
function deliveryBlock(order) {
    // Si Google corrigió la dirección, el pedido conserva la escrita por el cliente en delivery_addressOriginal
    const corrected = Boolean(order.delivery_addressOriginal);
    const line = (label, value) => `<p style="margin: 0 0 6px 0; color: #1D1C1B; font-size: 14px;"><strong>${label}:</strong> ${value}</p>`;
    return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FDF8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #F0E2D1;">
        <tr>
            <td>
                <h3 style="color: #8B4513; font-size: 15px; margin: 0 0 12px 0;">🚚 ¡Atención! Estos son los datos de entrega</h3>
                ${line('Dirección', `${esc(order.delivery_address || '-')}, ${esc(order.delivery_city)} (${esc(order.delivery_zip)})`)}
                ${order.delivery_addressExtra ? line('Piso / puerta', esc(order.delivery_addressExtra)) : ''}
                ${corrected ? `<p style="margin: 0 0 6px 0; color: #5D4037; font-size: 13px;"><strong>Dirección que escribiste:</strong> ${esc(order.delivery_addressOriginal)}</p>` : ''}
                ${corrected ? '<p style="margin: 0 0 8px 0; padding: 8px 10px; background-color: #FFF3CD; border-radius: 6px; color: #7A4B00; font-size: 13px;"><strong>Hemos corregido tu dirección, compruébala por favor.</strong></p>' : ''}
                ${line('Teléfono', esc(order.customer_phone || '-'))}
                ${line('Fecha', esc(order.delivery_date || '-'))}
                <p style="margin: 0; color: #1D1C1B; font-size: 14px;"><strong>Tramo horario:</strong> ${esc(order.delivery_timeSlot || 'Por determinar')}</p>
                <p style="margin: 12px 0 0 0; color: #5D4037; font-size: 13px;">Revisa que la dirección y el teléfono sean correctos. Si detectas algún error, responde a este correo o escríbenos a <a href="mailto:${contactEmail()}" style="color: #E67E22; text-decoration: none;">${contactEmail()}</a> cuanto antes.</p>
            </td>
        </tr>
    </table>
    ${order.delivery_message ? `
    <div style="background-color: #FFF9F2; border-left: 4px solid #E67E22; padding: 16px; margin: 24px 0; border-radius: 6px;">
        <p style="margin: 0 0 6px 0; color: #8B4513; font-weight: bold; font-size: 13px; text-transform: uppercase;">💌 Mensaje para la Tarjeta:</p>
        <p style="margin: 0; color: #5D4037; font-style: italic; font-size: 14px;">"${esc(order.delivery_message)}"</p>
    </div>` : ''}`;
}

/** Líneas del pedido (tabla OrderItem: name, price, quantity), recargo y total con su etiqueta. */
function summaryBlock(order, totalLabel) {
    const rows = (order.items || []).map(item => {
        const qty = item.quantity || 1;
        return `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px dashed #EECDAB; color: #1D1C1B; font-size: 14px;"><strong>${esc(item.name || item.product?.name || 'Producto')}</strong> x ${qty}</td>
            <td style="padding: 12px 0; border-bottom: 1px dashed #EECDAB; color: #8B4513; font-weight: bold; text-align: right; font-size: 14px;">${money((item.price ?? item.product?.price) * qty)}€</td>
        </tr>`;
    }).join('');
    const surcharge = parseFloat(order.delivery_surchargeAmount || 0);
    const surchargeRow = surcharge > 0 ? `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px dashed #EECDAB; color: #E67E22; font-style: italic; font-size: 14px;">🚚 Incremento por desplazamiento</td>
            <td style="padding: 12px 0; border-bottom: 1px dashed #EECDAB; color: #E67E22; font-weight: bold; text-align: right; font-size: 14px;">${money(surcharge)}€</td>
        </tr>` : '';
    return `
    <h3 style="color: #8B4513; font-size: 16px; margin: 24px 0 12px 0;">🛍️ Resumen del Pedido</h3>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${rows}
        ${surchargeRow}
        <tr>
            <td style="padding: 16px 0 0 0; color: #8B4513; font-size: 18px; font-weight: bold;">${totalLabel}</td>
            <td style="padding: 16px 0 0 0; color: #8B4513; font-size: 20px; font-weight: bold; text-align: right;">${money(order.total)}€</td>
        </tr>
    </table>`;
}

async function send({ to, subject, html, what }) {
    if (!to) {
        console.warn(`⚠️ Pedido sin email: no se envía el correo de ${what}`);
        return false;
    }
    try {
        await transporter.sendMail({ from: fromAddress(), to, subject, html, attachments: [logoAttachment()] });
        console.log(`✅ Correo de ${what} enviado a ${to}`);
        return true;
    } catch (err) {
        console.error(`❌ Error al enviar el correo de ${what}:`, err.message);
        return false;
    }
}

/** Pago confirmado: resumen completo del pedido (se envía desde el aviso de pago de Stripe). */
function buildOrderEmailHtml(order) {
    return emailLayout({
        title: 'Confirmación de Pedido',
        subtitle: 'Confirmación de Pedido',
        body: `
            <h2 style="color: #8B4513; font-size: 22px; margin-top: 0;">¡Gracias por tu pedido, ${esc(order.customer_name || 'Cliente')}!</h2>
            <p style="color: #5D4037; font-size: 15px; line-height: 1.6;">Hemos recibido correctamente tu pedido y tu pago. Lo prepararemos con todo nuestro cariño y productos frescos del día.</p>
            ${orderNumberBlock(order.id)}
            ${deliveryBlock(order)}
            ${summaryBlock(order, 'Total Pagado')}`
    });
}

async function sendOrderConfirmationEmail(order) {
    return send({
        to: order.customer_email,
        subject: `Confirmación de Pedido #${order.id} - Desayuno con Diamante`,
        html: buildOrderEmailHtml(order),
        what: 'confirmación de pedido'
    });
}

/**
 * El pago no se ha podido completar: el pedido queda pendiente de pago y el cliente puede
 * pagarlo desde el botón del correo (misma pasarela, mismo número de pedido).
 */
function buildPaymentProblemEmailHtml(order, retryUrl) {
    return emailLayout({
        title: 'Pago pendiente',
        subtitle: 'Tu pedido está pendiente de pago',
        body: `
            <h2 style="color: #8B4513; font-size: 22px; margin-top: 0;">Hola ${esc(order.customer_name || '')}, tu pedido está pendiente de pago</h2>
            <p style="color: #5D4037; font-size: 15px; line-height: 1.6;">El pago de tu pedido no se ha completado (la pasarela de pago no ha podido procesarlo o se cerró antes de terminar), así que no se te ha cobrado nada. Lo hemos guardado con todos tus datos para que puedas terminar la compra cuando quieras.</p>
            ${orderNumberBlock(order.id)}
            <div style="text-align: center; margin: 8px 0 28px 0;">
                <a href="${esc(retryUrl)}" style="display: inline-block; background-color: #8B4513; color: #FFFFFF; text-decoration: none; font-weight: bold; font-size: 16px; padding: 14px 32px; border-radius: 30px;">Completar el pago</a>
                <p style="color: #5D4037; font-size: 12px; margin: 10px 0 0 0;">Irás directamente a la pasarela de pago con este mismo pedido; no tendrás que volver a rellenar nada.</p>
            </div>
            <div style="background-color: #FFF3CD; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; color: #7A4B00; font-size: 13px;">
                La hora de entrega no queda garantizada hasta que se complete el pago. Si otro cliente la reserva antes, al pagar te avisaremos para que elijas otra.
            </div>
            ${deliveryBlock(order)}
            ${summaryBlock(order, 'Total a pagar')}`
    });
}

async function sendPaymentProblemEmail(order, retryUrl) {
    return send({
        to: order.customer_email,
        subject: `Tu pedido #${order.id} está pendiente de pago - Desayuno con Diamante`,
        html: buildPaymentProblemEmailHtml(order, retryUrl),
        what: 'pago pendiente'
    });
}

async function sendSlotConflictRefundEmail(order, refunded = true) {
    return send({
        to: order.customer_email,
        subject: `Tu pedido #${order.id} no ha podido reservarse - Desayuno con Diamante`,
        what: 'conflicto de horario',
        html: emailLayout({
            title: 'Pedido no reservado',
            subtitle: 'Tu pedido no ha podido reservarse',
            body: `
                <div style="color: #5D4037; font-size: 15px; line-height: 1.6;">
                    <p>Hola ${esc(order.customer_name || '')},</p>
                    <p>Lamentablemente la hora de entrega que elegiste (${esc(order.delivery_date)} a las ${esc(order.delivery_timeSlot)}) fue reservada por otro cliente mientras completabas el pago, por lo que no podemos atender tu pedido en ese horario.</p>
                    <p>${refunded ? 'Hemos <strong>reembolsado el importe completo</strong> a tu tarjeta (puede tardar unos días en reflejarse).' : 'Estamos gestionando el reembolso del importe; nos pondremos en contacto contigo.'}</p>
                    <p>Puedes volver a hacer tu pedido eligiendo otra hora. Disculpa las molestias.</p>
                </div>`
        })
    });
}

module.exports = {
    transporter,
    sendOrderConfirmationEmail,
    sendPaymentProblemEmail,
    sendSlotConflictRefundEmail,
    buildOrderEmailHtml,
    buildPaymentProblemEmailHtml
};
