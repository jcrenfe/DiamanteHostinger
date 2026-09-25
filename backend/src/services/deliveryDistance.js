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

// Tipos de resultado que identifican un portal concreto. Si Google solo localiza una calle sin número,
// la ciudad o el código postal, la dirección está incompleta o no existe.
const PRECISE_TYPES = ['street_address', 'premise', 'subpremise'];

// Palabras de tipo de vía que se ignoran al comparar nombres de calle ("Calle", "C/", "Pl.", "Avda."…)
const STREET_PREFIXES = new Set(['calle', 'c', 'cl', 'plaza', 'pl', 'plza', 'paseo', 'po', 'p', 'avenida', 'avda', 'av',
    'camino', 'cmo', 'carretera', 'ctra', 'ronda', 'travesia', 'trv', 'glorieta', 'gta', 'de', 'del', 'la', 'el', 'los', 'las']);

const normalize = (text) => String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const significantTokens = (text) => normalize(text).split(' ').filter(t => t && !STREET_PREFIXES.has(t));
const component = (result, type) => (result.address_components || []).find(c => (c.types || []).includes(type));

/**
 * Indica si Google ha localizado un portal concreto (calle y número). La coincidencia parcial
 * sola no rechaza: Google la marca también cuando cambia un código postal equivocado, y eso se avisa
 * al cliente como corrección. Lo que se rechaza es que solo se haya localizado la zona (ciudad, CP…).
 */
function isPreciseMatch(result) {
    if (!(result.types || []).some(t => PRECISE_TYPES.includes(t))) return false;
    return !!component(result, 'street_number');
}

/**
 * Indica si Google ha modificado la dirección escrita por el cliente (errata en la calle o la
 * ciudad, otro número o un código postal distinto). Puede dar algún falso positivo inocuo
 * ("Pl." / "Plaza"): en ese caso solo se pide al cliente que compruebe la dirección.
 */
function wasCorrected(result, { address, city, zip }) {
    const typedTokens = normalize(address).split(' ');
    const streetTokens = significantTokens(component(result, 'route')?.long_name);
    if (streetTokens.length && !streetTokens.every(t => typedTokens.includes(t))) return true;

    const number = component(result, 'street_number')?.long_name;
    if (number && !typedTokens.some(t => t.startsWith(normalize(number)))) return true;

    const postal = component(result, 'postal_code')?.long_name;
    if (postal && zip && String(postal).trim() !== String(zip).trim()) return true;

    const locality = (component(result, 'locality') || component(result, 'administrative_area_level_3'))?.long_name;
    if (locality && city) {
        const g = normalize(locality), t = normalize(city);
        if (!(g.includes(t) || t.includes(g))) return true;
    }
    return false;
}

/**
 * Geocoding API: localiza la dirección. Devuelve null si Google no la encuentra o solo localiza la
 * zona; lanza si el servicio falla (facturación, clave, cuota…).
 */
async function geocodeAddress(fullAddress, typed) {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: fullAddress, language: 'es', key: GOOGLE_MAPS_KEY }
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
    if (!isPreciseMatch(result)) {
        return null; // solo se ha localizado la zona o falta el número: dirección incompleta
    }
    const cityPart = component(result, 'locality') || component(result, 'administrative_area_level_3') || component(result, 'administrative_area_level_2');
    return {
        formattedAddress: result.formatted_address,
        // Datos de entrega tal como los ha interpretado Google: son los que se guardan en el pedido
        address: `${component(result, 'route').long_name}, ${component(result, 'street_number').long_name}`,
        city: cityPart?.long_name,
        zip: component(result, 'postal_code')?.long_name,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        corrected: wasCorrected(result, typed)
    };
}

/** Routes API (computeRouteMatrix): duración y distancia en coche desde el origen hasta el destino. */
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
 * Comprueba que una dirección es correcta y completa (portal localizado por Google) y que está
 * dentro del radio de reparto configurado. Devuelve además la dirección normalizada por Google y
 * si esta difiere de la escrita (addressCorrected), para que el cliente la revise.
 * Diseño "fail-closed": si la dirección no se puede verificar (sin API key, fallo de Google o
 * sin dirección de origen para calcular la ruta) el pedido NO se acepta y se avisa al cliente.
 */
async function checkDeliveryDistance({ address, city, zip }) {
    const fullAddress = [address, zip, city, 'España'].filter(Boolean).join(', ');

    if (!GOOGLE_MAPS_KEY) {
        return { valid: false, checked: false, reason: 'check_unavailable' };
    }

    const { originAddress, maxDeliveryMinutes, proximityThresholds, deliverySurcharges } = await getDeliveryConfig();

    let geo;
    try {
        geo = await geocodeAddress(fullAddress, { address, city, zip });
    } catch (e) {
        console.error('❌ Geocoding de Google no disponible; no se puede verificar la dirección:', e.response?.data || e.message);
        return { valid: false, checked: false, reason: 'check_unavailable' };
    }
    if (!geo) {
        return { valid: false, checked: true, reason: 'address_not_found' };
    }
    const addressInfo = {
        formattedAddress: geo.formattedAddress,
        addressCorrected: geo.corrected,
        normalizedAddress: { address: geo.address, city: geo.city, zip: geo.zip }
    };

    if (!originAddress) {
        // Sin origen no hay ruta ni radio que aplicar; la dirección sí está verificada
        return { valid: true, checked: true, reason: 'no_origin_configured', ...addressInfo };
    }

    let route;
    try {
        route = await computeRoute(originAddress, geo.lat, geo.lng);
    } catch (e) {
        console.error('Error calculando ruta con Google Routes API:', e.response?.data || e.message);
        route = null;
    }
    if (!route) {
        return { valid: false, checked: false, reason: 'check_unavailable', ...addressInfo };
    }

    const durationMinutes = Math.round(route.durationSeconds / 60);
    const distanceKm = Math.round((route.distanceMeters / 1000) * 10) / 10;
    const proximity = classifyProximity(durationMinutes, proximityThresholds);

    if (durationMinutes > maxDeliveryMinutes) {
        return { valid: false, checked: true, reason: 'too_far', durationMinutes, distanceKm, maxDeliveryMinutes, proximity, ...addressInfo };
    }

    const surchargeAmount = computeSurcharge(proximity, distanceKm, deliverySurcharges);

    return { valid: true, checked: true, durationMinutes, distanceKm, proximity, surchargeAmount, ...addressInfo };
}

module.exports = { checkDeliveryDistance };
