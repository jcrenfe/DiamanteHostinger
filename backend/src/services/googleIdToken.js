const jwt = require('jsonwebtoken');

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const PROJECT_ID = process.env.FIREBASE_AUTH_PROJECT_ID || 'diamante-f70f4';

let cache = { certs: null, expiresAt: 0 };

async function fetchCerts() {
    if (cache.certs && Date.now() < cache.expiresAt) return cache.certs;
    const res = await fetch(CERTS_URL);
    if (!res.ok) throw new Error(`No se pudieron obtener las claves públicas de Google (${res.status})`);
    const maxAge = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
    cache = { certs: await res.json(), expiresAt: Date.now() + (maxAge ? Number(maxAge[1]) : 3600) * 1000 };
    return cache.certs;
}

let certsProvider = fetchCerts;
/** Solo para pruebas: sustituye la obtención de las claves públicas de Google. */
function setCertsProvider(fn) { certsProvider = fn || fetchCerts; }

/**
 * Verifica un ID token de Firebase Auth (login con Google) sin necesidad de credenciales de servicio:
 * comprueba la firma con las claves públicas de Google, el emisor, la audiencia (nuestro proyecto),
 * la caducidad y que el email esté verificado. Lanza un Error si algo no cuadra.
 */
async function verifyFirebaseIdToken(idToken) {
    if (typeof idToken !== 'string' || !idToken) throw new Error('Falta el token de identidad');
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || decoded.header.alg !== 'RS256' || !decoded.header.kid) throw new Error('Token de identidad no válido');

    const certs = await certsProvider();
    const key = certs[decoded.header.kid];
    if (!key) throw new Error('Clave de firma desconocida');

    const payload = jwt.verify(idToken, key, {
        algorithms: ['RS256'],
        audience: PROJECT_ID,
        issuer: `https://securetoken.google.com/${PROJECT_ID}`
    });
    if (!payload.sub || typeof payload.sub !== 'string') throw new Error('Token sin sujeto');
    if (!payload.email || payload.email_verified !== true) throw new Error('Email no verificado');

    return {
        uid: payload.sub,
        email: String(payload.email).toLowerCase(),
        displayName: payload.name || String(payload.email).split('@')[0],
        photoURL: payload.picture || null
    };
}

module.exports = { verifyFirebaseIdToken, setCertsProvider, PROJECT_ID };
