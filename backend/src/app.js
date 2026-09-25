// Importa el framework Express para construir el servidor HTTP y gestionar las rutas de la API
const express = require('express');

// Importa el middleware CORS para habilitar y controlar peticiones de origen cruzado desde el frontend Angular
const cors = require('cors');

// Importa Helmet para añadir cabeceras HTTP de seguridad y proteger la aplicación de vulnerabilidades web comunes
const helmet = require('helmet');

// Carga las variables de entorno definidas en el archivo '.env' en el objeto global 'process.env'
require('dotenv').config();

// Importa el módulo nativo 'path' de Node.js para trabajar con rutas de archivos y directorios de forma segura
const path = require('path');

// Crea una instancia de la aplicación Express para configurar las rutas y middlewares
const app = express();

// Define el puerto del servidor tomando la variable de entorno PORT, o por defecto el puerto 3000
const PORT = process.env.PORT || 3000;

// Configura los middlewares globales del servidor
// Activa las cabeceras HTTP seguras provistas por Helmet, permitiendo recursos cross-origin
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Habilita el control de acceso CORS para permitir peticiones desde orígenes autorizados
const defaultOrigins = [
    'http://localhost:4500',
    'http://localhost:4200',
    'https://desayuno.thewayweb.com',
    'https://thewayweb.com',
    'https://www.thewayweb.com',
    'https://api.thewayweb.com',
    'https://grupodiamanteespana.com',
    'https://www.grupodiamanteespana.com'
];

const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : defaultOrigins;

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (como llamadas servidor-a-servidor, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.warn(`Origen CORS no permitido: ${origin}`);
            callback(null, false);
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
};
app.use(cors(corsOptions));

// Configura Express para analizar automáticamente los cuerpos de petición HTTP que vengan en formato JSON
app.use(express.json());

// Configura Express para analizar los cuerpos de petición codificados en URL (formularios estándar)
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const productRoutes = require('./routes/products');
const uploadRoutes = require('./routes/upload');
// Ruta para gestionar formularios de contacto
const contactRoutes = require('./routes/contact');
// Ruta para gestionar pagos y notificaciones de Redsys
const paymentRoutes = require('./routes/payment');
// Ruta para gestionar la creación y envío masivo de campañas
const campaignRoutes = require('./routes/campaign');
// Ruta para gestionar la optimización logística de reparto
const logisticsRoutes = require('./routes/logistics');
// Ruta para ofertas
const offerRoutes = require('./routes/offers');
const categoryRoutes = require('./routes/categories');
const configRoutes = require('./routes/config');

// Servir archivos estáticos (imágenes subidas)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Registra los conjuntos de rutas bajo prefijos comunes en la URL del servidor
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/config', configRoutes);

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

