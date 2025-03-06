const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const logService = require('../../services/logService');

// Logs routes
router.get('/logs', async (req, res) => {
  try {
    const logs = await logService.getLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Metrics routes
router.get('/metrics', metricsController.getMetrics);
router.post('/metrics', metricsController.createMetric);
router.get('/metrics/:id', metricsController.getMetricById);

module.exports = router;
