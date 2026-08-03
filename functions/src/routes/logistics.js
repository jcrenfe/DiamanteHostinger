const express = require('express');
const router = express.Router();
const axios = require('axios');


const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const MOCK_MODE = !GOOGLE_MAPS_KEY;

/**
 * Route Optimization API (Enterprise Level)
 */
router.post('/optimize', async (req, res) => {
    const { orders, drivers = 1, marginMinutes = 10, optimizeFor = 'time' } = req.body;

    if (!orders || orders.length === 0) {
        return res.status(400).json({ success: false, message: "No hay pedidos." });
    }

    try {
        if (MOCK_MODE) {
            return res.json({ success: true, ...simulateOptimization(orders, drivers, marginMinutes) });
        }

        const url = `https://routeoptimization.googleapis.com/v1/projects/${PROJECT_ID}:optimizeTours`;

        // Define the Fleet Optimization Model
        const model = {
            shipments: orders.map((order, index) => ({
                pickups: [{
                    arrivalAddress: "Calle de la Princesa, 1, Madrid", // Start at Shop
                    duration: "300s" // Time to load
                }],
                deliveries: [{
                    arrivalAddress: order.address,
                    duration: `${marginMinutes * 60}s` // Margin as service duration
                }],
                label: `order_${index}`
            })),
            vehicles: Array.from({ length: drivers }, (_, i) => ({
                label: `driver_${i + 1}`,
                startLocation: { address: "Calle de la Princesa, 1, Madrid" },
                endLocation: { address: "Calle de la Princesa, 1, Madrid" },
                costPerKilometer: optimizeFor === 'distance' ? 10 : 1 // High cost per KM if optimizing for distance
            }))
        };

        const response = await axios.post(url, { model }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_MAPS_KEY
            }
        });

        const data = response.data;

        // Transform Google response back to our Frontend format
        const routes = data.routes.map((route, i) => {
            const routeOrders = (route.visits || []).map(visit => {
                const orderIndex = parseInt(visit.shipmentLabel.split('_')[1]);
                return orders[orderIndex];
            });

            const totalTimeSec = parseInt(route.metrics.travelDuration.replace('s', ''));
            const totalDistMeters = route.metrics.travelDistanceMeters;

            return {
                driverId: i + 1,
                orders: routeOrders,
                totalTime: totalTimeSec,
                totalDistance: totalDistMeters,
                probabilityOfSuccess: calculateProbability(totalTimeSec, routeOrders.length)
            };
        });

        res.json({
            success: true,
            routes,
            totalTime: routes.reduce((sum, r) => sum + r.totalTime, 0),
            totalDistance: routes.reduce((sum, r) => sum + r.totalDistance, 0)
        });

    } catch (error) {
        console.error("Route Optimization Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: "Error en la optimización de flota." });
    }
});

function calculateProbability(time, orderCount) {
    if (orderCount === 0) return 100;
    const avg = time / orderCount;
    if (avg < 900) return 98; // < 15min per stop
    if (avg < 1800) return 85;
    return 60;
}

function simulateOptimization(orders, drivers, margin) {
    return {
        routes: Array.from({ length: drivers }, (_, i) => ({
            driverId: i + 1,
            orders: orders.slice(i * Math.ceil(orders.length / drivers), (i + 1) * Math.ceil(orders.length / drivers)),
            totalTime: 4000 + Math.random() * 5000,
            totalDistance: 20000 + Math.random() * 10000,
            probabilityOfSuccess: 90
        }))
    };
}

module.exports = router;
