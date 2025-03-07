const express = require('express');
const router = express.Router();
const metricsService = require('../../services/metricsService');
const networkMetrics = require('../../services/metrics/networkMetrics');
const systemMetrics = require('../../services/metrics/systemMetrics');
const llmMetrics = require('../../services/metrics/llmMetrics');

// Core metrics routes
router.get('/metrics', async (req, res) => {
  try {
    const { range = '1h' } = req.query;
    const metrics = await metricsService.getMetrics(range);
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

// Add missing routes
router.get('/api/metrics', async (req, res) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/config', async (req, res) => {
  try {
    // Assuming there's a config service that provides the configuration
    const config = await configService.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/logs/error', async (req, res) => {
  try {
    // Assuming there's a log service that provides the logs
    const logs = await logService.getLogs(req.query.page, req.query.pageSize, req.query.level, req.query.service);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
