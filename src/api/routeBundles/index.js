const express = require('express');
const router = express.Router();

// Import route bundles
const userRoutes = require('./userRoutes');
const metricsRoutes = require('./metricsRoutes');
const toolsRoutes = require('./toolsRoutes');

// Mount route bundles
router.use('/api', userRoutes);
router.use('/api', metricsRoutes);
router.use('/api', toolsRoutes);

module.exports = router;
