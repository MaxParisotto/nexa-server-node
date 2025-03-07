import express from 'express';
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import MetricsCollector from './MetricsCollector.js';
import { SystemMetrics } from './systemMetrics.js';
import { NetworkMetrics } from './networkMetrics.js';
import { LLMMetrics } from './llmMetrics.js';

const router = express.Router();

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
    const metrics = await NetworkMetrics.getNetworkMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System metrics routes
router.get('/metrics/system', async (req, res) => {
  try {
    const metrics = await SystemMetrics.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LLM metrics routes
router.get('/metrics/llm', async (req, res) => {
  try {
    const metrics = await LLMMetrics.getLLMMetrics();
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

class MetricsService {
  constructor() {
    this.metricDefinitions = createMetricDefinitions();
    this.collectors = [
      new NetworkMetrics(),
      new LLMMetrics(),
      new SystemMetrics()
    ];
    this.metricsInterval = null;
    this.collectionFrequency = 5000; // 5 seconds
    this.METRICS_DIR = path.join(__dirname, '../../data/metrics');
  }

  async initialize(io) {
    this.io = io;
    await this.ensureMetricsDir();
    await Promise.all(this.collectors.map(collector => collector.initialize()));
    this.startMetricsCollection();
    this.setupSocketHandlers();
    return Promise.resolve();
  }

  startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.collectionFrequency);
  }

  async collectMetrics() {
    try {
      const timestamp = new Date().toISOString();
      
      // Check cache first
      const cachedMetrics = this.getCachedMetrics();
      if (cachedMetrics) {
        return cachedMetrics;
      }

      // Collect metrics with timeout and retries
      const [network, llm, system] = await Promise.all([
        this.withRetry(() => this.networkMetrics.collect(), 3),
        this.withRetry(() => this.llmMetrics.collect(), 3),
        this.withRetry(() => this.systemMetrics.collect(), 3)
      ]);

      const metrics = {
        timestamp,
        network,
        llm,
        system,
        visualization: this.getVisualizationConfig()
      };

      // Cache metrics
      this.cacheMetrics(metrics);

      winston.debug('Metrics collected:', metrics);
      this.io?.emit('metrics_update', metrics);

      // Store metrics in optimized format for historical analysis
      await this.storeMetrics({
        timestamp,
        data: {
          network_throughput: network.throughput,
          network_latency: network.latency,
          llm_requests: llm.requests,
          llm_errors: llm.errors,
          cpu_usage: system.cpu,
          memory_usage: system.memory
        }
      });
    } catch (error) {
      winston.error('Error collecting metrics:', error);
    }
  }

  setupSocketHandlers() {
    this.io?.on('connection', (socket) => {
      socket.on('get_metrics', async (type) => {
        try {
          let metrics;
          switch (type) {
            case 'network':
              metrics = await this.networkMetrics.collect();
              break;
            case 'llm':
              metrics = await this.llmMetrics.collect();
              break;
            case 'system':
              metrics = await this.systemMetrics.collect();
              break;
            default:
              metrics = await this.collectMetrics();
          }
          socket.emit('metrics_response', metrics);
        } catch (error) {
          winston.error('Error fetching metrics:', error);
          socket.emit('metrics_error', { error: error.message });
        }
      });
    });
  }

  async storeMetrics(metrics) {
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(this.METRICS_DIR, `${date}.json`);
    try {
      // Store metrics in optimized JSON format
      const metricData = {
        timestamp: metrics.timestamp,
        data: {
          network: metrics.network,
          llm: metrics.llm,
          system: metrics.system
        },
        visualization: metrics.visualization
      };

      // Append to JSON array
      let existingData = [];
      if (fs.existsSync(filePath)) {
        const fileContent = await fs.readFile(filePath, 'utf8');
        existingData = JSON.parse(fileContent);
      }
      existingData.push(metricData);
      
      await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));
    } catch (error) {
      winston.error(`Error storing metrics in ${filePath}:`, error);
    }
  }

  async ensureMetricsDir() {
    try {
      await fs.mkdir(this.METRICS_DIR, { recursive: true });
    } catch (error) {
      winston.error('Error creating metrics directory:', error);
    }
  }

  // Cache methods
  cacheMetrics(metrics) {
    this.metricsCache = metrics;
    this.cacheTimestamp = Date.now();
  }

  getCachedMetrics() {
    if (this.metricsCache && Date.now() - this.cacheTimestamp < 2000) {
      return this.metricsCache;
    }
    return null;
  }

  // Retry logic
  async withRetry(fn, retries = 3, delay = 500) {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.withRetry(fn, retries - 1, delay * 2);
    }
  }

  // Visualization configuration
  getVisualizationConfig() {
    return {
      network: {
        chartType: 'line',
        units: 'Mbps',
        color: '#4f46e5'
      },
      llm: {
        chartType: 'bar',
        units: 'requests',
        color: '#10b981'
      },
      system: {
        chartType: 'area',
        units: '%',
        color: '#f59e0b'
      }
    };
  }

  stop() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}

export default new MetricsService();
