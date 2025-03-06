/**
 * Consolidated metrics routes
 */
const express = require('express');
const router = express.Router();
const { handleAsync } = require('../middleware/core/middleware');
const metricsService = require('../../services/core/metricsService');

// Unified metrics endpoint
router.get('/:type?', handleAsync(async (req, res) => {
  const metrics = await metricsService.getMetrics(req.params.type);
  res.json(metrics);
}));

// Agent-specific metrics
router.get('/agent/:id', handleAsync(async (req, res) => {
  const metrics = await metricsService.getAgentMetrics(req.params.id);
  res.json(metrics);
}));

module.exports = router;
