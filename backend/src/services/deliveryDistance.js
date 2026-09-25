const axios = require('axios');
const prisma = require('../config/prisma');

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DEFAULT_MAX_DELIVERY_MINUTES = 60;

const DEFAULT_PROXIMITY_THRESHOLDS = { nearMaxMinutes: 15, mediumMaxMinutes: 30 };
const DEFAULT_SURCHARGES = {
    medium: { type: 'fixed', amount: 0 },
    far: { type: 'fixed', amount: 0 }
};

async function getDeliveryConfig() {
    const configDoc = await prisma.configuration.findUnique({ where: { id: 'disponibilidad' } });
    const value = configDoc?.value || {};
    return {
        originAddress: value.originAddress || '',
        maxDeliveryMinutes: value.maxDeliveryMinutes ?? DEFAULT_MAX_DELIVERY_MINUTES,
        proximityThresholds: { ...DEFAULT_PROXIMITY_THRESHOLDS, ...(value.proximityThresholds || {}) },
        deliverySurcharges: {
            medium: { ...DEFAULT_SURCHARGES.medium, ...(value.deliverySurcharges?.medium || {}) },
            far: { ...DEFAULT_SURCHARGES.far, ...(value.deliverySurcharges?.far || {}) }
        }
    };
}

function classifyProximity(durationMinutes, thresholds) {
    if (durationMinutes <= thresholds.nearMaxMinutes) return 'near';
    if (durationMinutes <= thresholds.mediumMaxMinutes) return 'medium';
    return 'far';
}

function computeSurcharge(proximity, distanceKm, surcharges) {
    if (proximity === 'near') return 0;
    const rule = surcharges[proximity];
    if (!rule) return 0;
    if (rule.type === 'perKm') return Math.round(rule.amount * distanceKm * 100) / 100;
    return rule.amount || 0;
}

async function geocodeAddress(address) {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address, key: GOOGLE_MAPS_KEY }
    });
    const status = response.data.status;
    if (status === 'ZERO_RESULTS' || (status === 'OK' && !response.data.results.length)) {
        return null; // la dirección realmente no existe
    }
    if (status !== 'OK') {
        // REQUEST_DENIED (facturación/clave), OVER_QUERY_LIMIT, etc.: es un fallo del servicio, no de la dirección
        throw new Error(`Geocoding API: ${status} ${response.data.error_message || ''}`.trim());
    }
    const result = response.data.results[0];
    return {
        formattedAddress: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
    };
}

async function computeRoute(originAddress, destLat, destLng) {
    const response = await axios.post('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        origins: [{ waypoint: { address: originAddress } }],
        destinations: [{ waypoint: { location: { latLng: { latitude: destLat, longitude: destLng } } } }],
        travelMode: 'DRIVE'
    }, {
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
            'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration,status'
        }
    });
    const row = Array.isArray(response.data) ? response.data[0] : null;
    if (!row || (row.status && row.status.code)) return null;
    return {
        distanceMeters: row.distanceMeters,
        durationSeconds: parseInt(String(row.duration).replace('s', ''), 10)
    };
}

/**
 * Comprueba que una dirección existe y está dentro del radio de reparto configurado.
 * Diseño "fail-open": si no hay API key, no hay dirección de origen configurada, o la
 * llamada a Google falla, se permite el pedido (checked: false) en lugar de bloquear
 * ventas por un fallo de configuración o de un servicio de terceros.
 */
async function checkDeliveryDistance({ address, city, zip }) {
    const fullAddress = [address, zip, city, 'España'].filter(Boolean).join(', ');

    if (!GOOGLE_MAPS_KEY) {
        return { valid: true, checked: false, reason: 'no_api_key' };
    }

    const { originAddress, maxDeliveryMinutes, proximityThresholds, deliverySurcharges } = await getDeliveryConfig();
    if (!originAddress) {
        return { valid: true, checked: false, reason: 'no_origin_configured' };
    }

    let geo;
    try {
        geo = await geocodeAddress(fullAddress);
    } catch (e) {
        console.error('❌ Geocoding de Google no disponible; se acepta el pedido sin comprobar la distancia:', e.response?.data || e.message);
        return { valid: true, checked: false, reason: 'geocode_unavailable' };
    }
    if (!geo) {
        return { valid: false, checked: true, reason: 'address_not_found' };
    }

    let route;
    try {
        route = await computeRoute(originAddress, geo.lat, geo.lng);
    } catch (e) {
        console.error('Error calculando ruta con Google Routes API:', e.response?.data || e.message);
        route = null;
    }

    if (!route) {
        return { valid: true, checked: false, reason: 'route_unavailable', formattedAddress: geo.formattedAddress };
    }

    const durationMinutes = Math.round(route.durationSeconds / 60);
    const distanceKm = Math.round((route.distanceMeters / 1000) * 10) / 10;
    const proximity = classifyProximity(durationMinutes, proximityThresholds);

    if (durationMinutes > maxDeliveryMinutes) {
        return {
            valid: false,
            checked: true,
            reason: 'too_far',
            durationMinutes,
            distanceKm,
            maxDeliveryMinutes,
            proximity,
            formattedAddress: geo.formattedAddress
        };
    }

    const surchargeAmount = computeSurcharge(proximity, distanceKm, deliverySurcharges);

    return {
        valid: true,
        checked: true,
        durationMinutes,
        distanceKm,
        proximity,
        surchargeAmount,
        formattedAddress: geo.formattedAddress
    };
}

module.exports = { checkDeliveryDistance };
