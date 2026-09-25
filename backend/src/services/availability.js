const STEP = 30;
// Tiempo que una reserva sin pagar (pending/failed) mantiene bloqueada la hora.
const HOLD_MINUTES = 10;
const DEFAULT_RULES = {
    near: { beforeMinutes: 60, afterMinutes: 30 },
    medium: { beforeMinutes: 90, afterMinutes: 60 },
    far: { beforeMinutes: 120, afterMinutes: 90 }
};

const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const toTime = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function madridNow(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now).reduce((a, p) => ({ ...a, [p.type]: p.value }), {});
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

// Con un pago de Stripe en curso la hora se retiene lo que dura la sesión de pago (Stripe exige >= 30 min).
const PAYMENT_HOLD_MINUTES = 31;
// Marca temporal en stripeSessionId mientras se crea la sesión de pago.
const PAYMENT_STARTING = 'starting';
const INACTIVE_STATUSES = ['cancelled', 'refunded', 'paid_conflict'];

/**
 * ¿La reserva bloquea la hora?
 *  - pagadas/entregadas: siempre; canceladas, reembolsadas o en conflicto: nunca.
 *  - sin pagar con pago en curso (stripeSessionId): PAYMENT_HOLD_MINUTES desde que empezó el pago.
 *  - sin pagar y sin pago en curso: HOLD_MINUTES desde su creación.
 */
function isActiveBooking(order, now = new Date()) {
    if (INACTIVE_STATUSES.includes(order.status)) return false;
    const unpaid = order.status === 'pending' || order.status === 'failed';
    if (!unpaid) return true;
    const ageMin = (d) => (now.getTime() - new Date(d).getTime()) / 60000;
    if (order.stripeSessionId && order.updatedAt) return ageMin(order.updatedAt) < PAYMENT_HOLD_MINUTES;
    if (order.createdAt) return ageMin(order.createdAt) < HOLD_MINUTES;
    return true;
}

/** Al confirmarse un pago: ¿choca la hora con otro pedido YA PAGADO? (un pago consumado gana a una retención sin pagar) */
function hasPaidConflict({ config, orders, order }) {
    const paidOthers = orders.filter(o => o.id !== order.id && o.delivery_date === order.delivery_date && (o.status === 'paid' || o.status === 'delivered'));
    return blockedMinutes(paidOthers, config).has(toMin(order.delivery_timeSlot));
}

/** Horas de reparto configuradas para una fecha (sin tener en cuenta reservas). */
function configuredSlots(config, dateStr) {
    if (!config || !Array.isArray(config.deliveryDays) || !config.deliveryDays.includes(dateStr)) return [];
    const [y, m, d] = dateStr.split('-').map(Number);
    const ranges = (config.dailySlots || {})[String(new Date(y, m - 1, d).getDay())] || [];
    const slots = [];
    ranges.forEach(r => { for (let c = toMin(r.start); c < toMin(r.end); c += STEP) slots.push(c); });
    return slots;
}

/** Minutos bloqueados por las reservas: cada una según SU proximidad (calculada con Google Maps). */
function blockedMinutes(orders, config) {
    const rules = { ...DEFAULT_RULES, ...(config?.blockingRules || {}) };
    const blocked = new Set();
    orders.forEach(o => {
        if (!o.delivery_timeSlot) return;
        const center = toMin(o.delivery_timeSlot);
        const rule = rules[o.delivery_proximity] || rules.near;
        blocked.add(center);
        for (let m = center - STEP; m >= center - rule.beforeMinutes; m -= STEP) blocked.add(m);
        for (let m = center + STEP; m <= center + rule.afterMinutes; m += STEP) blocked.add(m);
    });
    return blocked;
}

/**
 * Valida fecha+hora contra la configuración y las reservas existentes.
 * Devuelve null si es válida o { status, error } si no.
 */
function validateSlot({ config, orders, dateStr, timeSlot, now = new Date() }) {
    if (!config) return { status: 409, error: 'La disponibilidad de entrega no está configurada.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '') || !/^\d{2}:\d{2}$/.test(timeSlot || '')) {
        return { status: 422, error: 'Fecha u hora de entrega no válidas.' };
    }
    const slots = configuredSlots(config, dateStr);
    if (!slots.includes(toMin(timeSlot))) {
        return { status: 422, error: 'El día u hora de entrega elegidos no están disponibles.' };
    }
    const today = madridNow(now);
    if (dateStr < today.date || (dateStr === today.date && toMin(timeSlot) <= today.minutes)) {
        return { status: 422, error: 'La hora de entrega elegida ya ha pasado.' };
    }
    const sameDay = orders.filter(o => o.delivery_date === dateStr && isActiveBooking(o, now));
    if (blockedMinutes(sameDay, config).has(toMin(timeSlot))) {
        return { status: 409, error: 'Esa hora ya no está disponible. Elige otra.' };
    }
    return null;
}

module.exports = { HOLD_MINUTES, PAYMENT_HOLD_MINUTES, PAYMENT_STARTING, hasPaidConflict, isActiveBooking, configuredSlots, blockedMinutes, validateSlot, madridNow, toMin, toTime };
