const axios = require('axios');

// La Routes API limita a 50 el total de orígenes + destinos indicados como dirección de texto
// (con n paradas + el origen, se usan 2·(n+1)).
const MAX_STOPS = 24;

/**
 * Matriz de tiempos y distancias en coche entre el origen y todas las paradas (Routes API,
 * computeRouteMatrix). addresses[0] = origen. Devuelve { durations, distances } en segundos y metros.
 * Lanza si Google falla o alguna pareja no tiene ruta.
 */
async function computeMatrix(addresses) {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    const waypoints = addresses.map(address => ({ waypoint: { address } }));
    const response = await axios.post('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        origins: waypoints,
        destinations: waypoints,
        travelMode: 'DRIVE'
    }, {
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration,status,condition'
        }
    });
    const n = addresses.length;
    const durations = Array.from({ length: n }, () => Array(n).fill(null));
    const distances = Array.from({ length: n }, () => Array(n).fill(null));
    for (const el of Array.isArray(response.data) ? response.data : []) {
        if (el.status && el.status.code) continue;
        if (el.condition && el.condition !== 'ROUTE_EXISTS') continue;
        durations[el.originIndex][el.destinationIndex] = parseInt(String(el.duration).replace('s', ''), 10) || 0;
        distances[el.originIndex][el.destinationIndex] = el.distanceMeters || 0;
    }
    for (let i = 0; i < n; i++) { durations[i][i] = 0; distances[i][i] = 0; }
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (durations[i][j] === null) {
                const e = new Error('No se ha podido calcular la ruta entre dos de las direcciones.');
                e.code = 'no_route';
                e.pair = [i, j];
                throw e;
            }
        }
    }
    return { durations, distances };
}

module.exports = { computeMatrix, MAX_STOPS };
