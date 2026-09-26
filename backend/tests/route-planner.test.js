const test = require('node:test');
const assert = require('node:assert/strict');
const { planRoute } = require('../src/services/routePlanner');

// Matriz simétrica en segundos; índice 0 = origen
const matrix = (mins) => mins.map(row => row.map(m => m * 60));
const meters = (km) => km.map(row => row.map(k => k * 1000));

test('respeta el orden de las franjas cuando las paradas están en línea', () => {
    const durations = matrix([[0, 5, 10, 15], [5, 0, 5, 10], [10, 5, 0, 5], [15, 10, 5, 0]]);
    const distances = meters([[0, 2, 4, 6], [2, 0, 2, 4], [4, 2, 0, 2], [6, 4, 2, 0]]);
    const plan = planRoute({
        stops: [{ id: 'c', timeSlot: '12:00' }, { id: 'a', timeSlot: '09:00' }, { id: 'b', timeSlot: '10:30' }],
        durations, distances, serviceMin: 5
    });
    assert.deepEqual(plan.stops.map(s => s.id), ['a', 'b', 'c']);
    assert.equal(plan.warnings.length, 0);
});

test('la salida se calcula para llegar a la primera parada al empezar su franja', () => {
    const durations = matrix([[0, 20], [20, 0]]);
    const plan = planRoute({ stops: [{ id: 'a', timeSlot: '10:00' }], durations, distances: meters([[0, 8], [8, 0]]), serviceMin: 0 });
    assert.equal(plan.departure, '09:40');
    assert.equal(plan.stops[0].eta, '10:00');
    assert.equal(plan.totalDistanceKm, 8);
});

test('avisa si una parada no llega a su franja', () => {
    // dos paradas en la misma franja separadas 40 min: la segunda no puede llegar a tiempo
    const durations = matrix([[0, 5, 5], [5, 0, 40], [5, 40, 0]]);
    const plan = planRoute({
        stops: [{ id: 'a', timeSlot: '10:00' }, { id: 'b', timeSlot: '10:00' }],
        durations, distances: meters([[0, 1, 1], [1, 0, 9], [9, 9, 0]]), serviceMin: 5
    });
    assert.equal(plan.warnings.length, 1);
    assert.ok(plan.stops.some(s => s.lateMin > 0));
});

test('espera en la parada si llega antes de su franja', () => {
    const durations = matrix([[0, 5, 5], [5, 0, 5], [5, 5, 0]]);
    const plan = planRoute({
        stops: [{ id: 'a', timeSlot: '09:00' }, { id: 'b', timeSlot: '11:00' }],
        durations, distances: meters([[0, 1, 1], [1, 0, 1], [1, 1, 0]]), serviceMin: 5
    });
    assert.deepEqual(plan.stops.map(s => s.id), ['a', 'b']);
    assert.ok(plan.stops[1].waitMin > 0);
    assert.equal(plan.stops[1].eta, '11:00');
});

test('reordena por cercanía cuando las franjas lo permiten', () => {
    // a y c en la misma franja; c está pegado a b (10:30) y a está lejos: conviene a → c → b
    const durations = matrix([[0, 5, 30, 6], [5, 0, 25, 4], [30, 25, 0, 20], [6, 4, 20, 0]]);
    const distances = meters([[0, 1, 9, 1], [1, 0, 8, 1], [9, 8, 0, 7], [1, 1, 7, 0]]);
    const plan = planRoute({
        stops: [{ id: 'a', timeSlot: '10:00' }, { id: 'b', timeSlot: '10:00' }, { id: 'c', timeSlot: '10:00' }],
        durations, distances, serviceMin: 2
    });
    assert.equal(plan.warnings.length, 0);
    assert.equal(plan.stops.length, 3);
});

test('rechaza una franja horaria inválida', () => {
    assert.throws(() => planRoute({ stops: [{ id: 'a', timeSlot: 'mañana' }], durations: matrix([[0, 1], [1, 0]]), distances: meters([[0, 1], [1, 0]]) }));
});
