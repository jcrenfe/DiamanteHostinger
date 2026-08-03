// Importa el SDK de administración de Firebase para realizar operaciones seguras en el servidor
const admin = require('firebase-admin');

/**
 * Middleware para validar y descifrar el token de ID enviado por Firebase desde el cliente
 */
const verifyToken = async (req, res, next) => {
    // Extrae la cabecera 'Authorization' de la petición HTTP recibida
    const authHeader = req.headers.authorization;

    // Comprueba si la cabecera no existe o si no empieza con el formato estándar 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Retorna un código 401 (No Autorizado) y detiene la ejecución si el formato es inválido
        return res.status(401).json({ error: 'No autorizado. Se requiere token Bearer.' });
    }

    // Divide la cadena por el espacio y toma la parte del token JWT (índice 1)
    const token = authHeader.split(' ')[1];

    try {
        // Usa el SDK de Firebase para verificar la firma del token y descifrar sus datos de forma asíncrona
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Guarda la información descifrada del usuario (UID, email, claims) en la petición para futuras rutas
        req.user = decodedToken;
        
        // Permite que la petición continúe con el siguiente middleware o controlador
        next();
    } catch (error) {
        // Muestra en consola el detalle del error criptográfico o de expiración para depuración
        console.error('Error verificando token:', error.message);
        
        // Responde al cliente con un estado 401 informando de que el token ya no es válido o ha expirado
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

/**
 * Middleware para comprobar si el usuario verificado tiene permisos de Administrador
 */
const isAdmin = (req, res, next) => {
    // Comprueba si el objeto de usuario existe y si su rol personalizado ('role') es igual a 'admin'
    if (req.user && req.user.role === 'admin') {
        // Si tiene el rol de administrador, permite que la petición continúe
        next();
    } else {
        // En Firebase Auth se suelen configurar Custom Claims para roles persistidos en el token
        // Si no se encuentra el claim 'role', se comprueba un claim secundario 'admin' que sea booleano (true)
        if (req.user && req.user.admin === true) {
            // Si tiene el claim booleano en true, permite continuar
            next();
        } else {
            // Si no se cumple ninguna de las dos condiciones de administrador, se deniega el acceso con código 403 (Prohibido)
            res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
        }
    }
};

// Exporta las funciones middleware para que se puedan importar y usar en las definiciones de rutas del backend
module.exports = { verifyToken, isAdmin };

