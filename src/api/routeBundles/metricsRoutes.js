const express = require('express');
const router = express.Router();
const metricsService = require('../../services/metricsService');
const networkMetrics = require('../../services/metrics/networkMetrics');
const systemMetrics = require('../../services/metrics/systemMetrics');
const llmMetrics = require('../../services/metrics/llmMetrics');

// Core metrics routes
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Network metrics routes
router.get('/metrics/network', async (req, res) => {
  try {
    const metrics = await networkMetrics.getNetworkMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System metrics routes
router.get('/metrics/system', async (req, res) => {
  try {
    const metrics = await systemMetrics.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LLM metrics routes
router.get('/metrics/llm', async (req, res) => {
  try {
    const metrics = await llmMetrics.getLLMMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
