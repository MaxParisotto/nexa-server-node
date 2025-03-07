const express = require('express');
const router = express.Router();
const path = require('path');
const metricsService = require('../../services/metrics');

// Serve metrics dashboard
router.get('/metrics', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard/metrics.html'));
});

// Get current metrics
router.get('/metrics/data', async (req, res) => {
  try {
    const metrics = await metricsService.collectMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save dashboard configuration
router.post('/save', async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ error: 'Configuration data required' });
    }
    
    // Validate config structure
    if (!config.layout || !Array.isArray(config.widgets)) {
      return res.status(400).json({ error: 'Invalid configuration format' });
    }

    // Validate widget types
    const validWidgets = ['chart', 'gauge', 'table', 'status'];
    const invalidWidget = config.widgets.find(w => !validWidgets.includes(w.type));
    if (invalidWidget) {
      return res.status(400).json({ 
        error: `Invalid widget type: ${invalidWidget.type}`,
        validTypes: validWidgets
      });
    }

    // TODO: Implement actual save logic
    res.json({ 
      message: 'Configuration saved successfully',
      configId: Date.now() // Temporary ID until persistence is implemented
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Load dashboard configuration 
router.get('/load', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Configuration ID required' });
    }

    // TODO: Implement actual load logic
    const config = {
      layout: 'grid',
      widgets: [
        {
          type: 'chart',
          id: 'cpu-usage',
          title: 'CPU Usage',
          metrics: ['cpu.user', 'cpu.system'],
          refreshInterval: 1000,
          chartType: 'line',
          colors: ['#4CAF50', '#FF5722']
        },
        {
          type: 'chart',
          id: 'memory-usage',
          title: 'Memory Usage',
          metrics: ['memory.used', 'memory.free'],
          refreshInterval: 1000,
          chartType: 'line',
          colors: ['#2196F3', '#9C27B0']
        },
        {
          type: 'gauge',
          id: 'cpu-gauge',
          title: 'CPU Utilization',
          metric: 'cpu.total',
          maxValue: 100,
          thresholds: [50, 75],
          colors: ['#4CAF50', '#FFC107', '#F44336']
        }
      ]
    };
    
    res.json(config);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
