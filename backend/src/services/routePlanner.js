/**
 * Planificador de la ruta de reparto de UN repartidor.
 *
 * Recibe las paradas elegidas (cada una con su franja de entrega, p. ej. "10:00" = 10:00-10:30) y la
 * matriz de tiempos de viaje (índice 0 = origen, 1..n = paradas) y devuelve el orden recomendado.
 *  - Prioridad 1: que cada parada se atienda dentro de su franja (se penaliza cada minuto de retraso).
 *  - Prioridad 2: minimizar la duración total de la ruta (conducción + esperas + tiempo por entrega).
 * La hora de salida se calcula para llegar a la primera parada justo al empezar su franja.
 * No incluye la vuelta al origen.
 */

const SLOT_MINUTES = 30;
const LATE_PENALTY = 1000; // un minuto de retraso pesa más que cualquier ahorro de conducción

function slotStartMinutes(timeSlot) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeSlot || '').trim());
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

const fmt = (minutes) => {
    const total = Math.round(minutes);
    const h = Math.floor(total / 60), mm = ((total % 60) + 60) % 60;
    return `${String(((h % 24) + 24) % 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

/**
 * Simula una secuencia (índices de parada 1..n) y devuelve su coste y el detalle de cada parada.
 * durations[i][j] = segundos de i a j.
 */
function simulate(seq, stops, durations, serviceMin) {
    const first = seq[0];
    const startOfFirst = stops[first - 1].start;
    const departure = startOfFirst - durations[0][first] / 60;
    let t = departure;
    let prev = 0;
    let lateTotal = 0;
    const detail = [];
    for (const idx of seq) {
        const leg = durations[prev][idx] / 60;
        t += leg;
        const arrival = t;
        const start = stops[idx - 1].start;
        const wait = Math.max(0, start - arrival);
        const late = Math.max(0, arrival - (start + SLOT_MINUTES));
        t = arrival + wait;
        detail.push({ idx, legMin: leg, arrival: t, wait, late });
        lateTotal += late;
        t += serviceMin;
        prev = idx;
    }
    const duration = t - departure;
    return { cost: lateTotal * LATE_PENALTY + duration, lateTotal, departure, duration, end: t, detail };
}

function improve(seq, evalCost) {
    let best = seq.slice(), bestCost = evalCost(best);
    let improved = true, guard = 0;
    while (improved && guard++ < 300) {
        improved = false;
        const n = best.length;
        const candidates = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const swap = best.slice(); [swap[i], swap[j]] = [swap[j], swap[i]]; candidates.push(swap);
                const rev = best.slice(0, i).concat(best.slice(i, j + 1).reverse(), best.slice(j + 1)); candidates.push(rev);
            }
            for (let j = 0; j < n; j++) {
                if (j === i) continue;
                const mv = best.slice(); const [x] = mv.splice(i, 1); mv.splice(j, 0, x); candidates.push(mv);
            }
        }
        for (const c of candidates) {
            const cost = evalCost(c);
            if (cost < bestCost - 1e-9) { best = c; bestCost = cost; improved = true; }
        }
    }
    return best;
}

/**
 * @param {Array<{id:string,timeSlot:string}>} stops  paradas elegidas
 * @param {number[][]} durations                        segundos; [0] = origen
 * @param {number[][]} distances                        metros; misma forma
 * @param {number} serviceMin                           minutos por entrega (aparcar, subir, entregar)
 */
function planRoute({ stops, durations, distances, serviceMin = 10 }) {
    if (!stops.length) throw new Error('No hay paradas');
    const items = stops.map(s => ({ ...s, start: slotStartMinutes(s.timeSlot) }));
    if (items.some(s => s.start === null)) throw new Error('Alguna parada no tiene una franja horaria válida');

    const evalCost = (seq) => simulate(seq, items, durations, serviceMin).cost;
    const initial = items.map((_, i) => i + 1)
        .sort((a, b) => items[a - 1].start - items[b - 1].start || durations[0][a] - durations[0][b]);
    const seq = improve(initial, evalCost);
    const sim = simulate(seq, items, durations, serviceMin);

    let prev = 0, totalMeters = 0, drivingSec = 0;
    const route = sim.detail.map(d => {
        const meters = distances[prev][d.idx];
        totalMeters += meters; drivingSec += durations[prev][d.idx];
        prev = d.idx;
        const s = items[d.idx - 1];
        return {
            id: s.id,
            timeSlot: s.timeSlot,
            eta: fmt(d.arrival),
            waitMin: Math.round(d.wait),
            lateMin: Math.round(d.late),
            legMinutes: Math.round(d.legMin),
            legKm: Math.round(meters / 100) / 10
        };
    });
    const warnings = route.filter(r => r.lateMin > 0)
        .map(r => ({ id: r.id, message: `Llegaría ${r.lateMin} min tarde a su franja de las ${r.timeSlot}.` }));
    return {
        departure: fmt(sim.departure),
        end: fmt(sim.end),
        totalDrivingMinutes: Math.round(drivingSec / 60),
        totalDistanceKm: Math.round(totalMeters / 100) / 10,
        stops: route,
        warnings
    };
}

module.exports = { planRoute, slotStartMinutes, SLOT_MINUTES };
