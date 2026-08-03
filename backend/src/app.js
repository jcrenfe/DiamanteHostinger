// Importa el framework Express para construir el servidor HTTP y gestionar las rutas de la API
const express = require('express');

// Importa el middleware CORS para habilitar y controlar peticiones de origen cruzado desde el frontend Angular
const cors = require('cors');

// Importa Helmet para añadir cabeceras HTTP de seguridad y proteger la aplicación de vulnerabilidades web comunes
const helmet = require('helmet');

// Importa el SDK de administración de Firebase para tener privilegios de lectura y escritura en la base de datos y autenticación
const admin = require('firebase-admin');

// Carga las variables de entorno definidas en el archivo '.env' en el objeto global 'process.env'
require('dotenv').config();

// Importa el módulo nativo 'path' de Node.js para trabajar con rutas de archivos y directorios de forma segura
const path = require('path');

// Comprueba si se ha definido la ruta del archivo JSON de credenciales de Firebase en las variables de entorno
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
        // Resuelve la ruta absoluta del archivo de credenciales concatenando el directorio actual con la variable de entorno
        const saPath = path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        
        // Carga y lee el contenido del archivo JSON de credenciales de la cuenta de servicio de Firebase
        const serviceAccount = require(saPath);
        
        // Inicializa la aplicación de administración de Firebase utilizando la credencial cargada
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        // Imprime en la consola del servidor que Firebase Admin se ha conectado correctamente indicando la ruta del archivo
        console.log('Firebase Admin Initialized from:', saPath);
    } catch (err) {
        // En caso de fallo al leer el JSON o conectar, muestra una advertencia en la consola con el mensaje de error
        console.warn('Error initializing Firebase Admin with JSON:', err.message);
    }
} else {
    // Si no hay un archivo de credenciales local especificado, intenta inicializar con la configuración por defecto
    try {
        // Inicializa Firebase Admin usando credenciales implícitas (por ejemplo, si el código se ejecuta en Google Cloud Platform)
        admin.initializeApp();
        // Imprime que se ha inicializado con la configuración predeterminada
        console.log('Firebase Admin Initialized (Default).');
    } catch (err) {
        // Si falla la inicialización predeterminada, advierte en consola que se necesita configurar el archivo en el '.env'
        console.warn('Firebase Admin NOT initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON in .env');
    }
}

// Crea una instancia de la aplicación Express para configurar las rutas y middlewares
const app = express();

// Define el puerto del servidor tomando la variable de entorno PORT, o por defecto el puerto 3000
const PORT = process.env.PORT || 3000;

// Configura los middlewares globales del servidor
// Activa las cabeceras HTTP seguras provistas por Helmet
app.use(helmet());

// Habilita el control de acceso CORS para permitir peticiones desde cualquier origen por defecto
app.use(cors());

// Configura Express para analizar automáticamente los cuerpos de petición HTTP que vengan en formato JSON
app.use(express.json());

// Configura Express para analizar los cuerpos de petición codificados en URL (formularios estándar)
app.use(express.urlencoded({ extended: true }));

// Importa los archivos de rutas de la API desde la carpeta routes
// Ruta para gestionar formularios de contacto
const contactRoutes = require('./routes/contact');
// Ruta para gestionar pagos y notificaciones de Redsys
const paymentRoutes = require('./routes/payment');
// Ruta para gestionar la creación y envío masivo de campañas
const campaignRoutes = require('./routes/campaign');
// Ruta para gestionar la optimización logística de reparto
const logisticsRoutes = require('./routes/logistics');

// Registra los conjuntos de rutas bajo prefijos comunes en la URL del servidor
app.use('/api/contact', contactRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/logistics', logisticsRoutes);

// Define una ruta GET básica en la raíz ('/') para verificar el estado de salud del servidor
app.get('/', (req, res) => {
    // Responde al cliente con un objeto JSON confirmando que la API está levantada y funcionando
    res.json({ message: "Diamante Backend API - Running" });
});

// Pone al servidor Express a escuchar las peticiones HTTP entrantes en el puerto configurado
app.listen(PORT, () => {
    // Imprime en la consola del servidor que está en funcionamiento y listo en el puerto indicado
    console.log(`Backend listening on port ${PORT}`);
});

