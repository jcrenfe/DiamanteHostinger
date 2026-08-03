const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const contactRoutes = require('./routes/contact');
const paymentRoutes = require('./routes/payment');
const campaignRoutes = require('./routes/campaign');
const logisticsRoutes = require('./routes/logistics');

app.use('/contact', contactRoutes);
app.use('/payment', paymentRoutes);
app.use('/campaign', campaignRoutes);
app.use('/logistics', logisticsRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Diamante Backend API - Running on Firebase Functions" });
});

module.exports = app;
