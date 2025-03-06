const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { handleAsync } = require('../middleware/core/middleware');
const logger = require('../../utils/logger').createLogger('monitoring');

// Consolidated monitoring endpoints
router.get('/metrics/system', handleAsync(async (req, res) => {
  const metrics = await require('../../services/metrics/systemMetrics').getLiveMetrics();
  res.json(metrics);
}));

router.get('/logs/:type', handleAsync(async (req, res) => {
  const logPath = path.join(__dirname, '../../logs', `${req.params.type}.log`);
  const logs = await fs.readFile(logPath, 'utf8');
  res.type('text/plain').send(logs);
}));

router.get('/dashboard/widgets', handleAsync(async (req, res) => {
  const dashboardData = await require('../../services/metrics/dashboardService').getWidgetData();
  res.json(dashboardData);
}));

module.exports = router;
