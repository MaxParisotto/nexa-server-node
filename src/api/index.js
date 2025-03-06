/**
 * API Server entry point
 */
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('../utils/logger').createLogger('api');
const networkTracker = require('./middleware/networkTracker');
const networkMetrics = require('../services/metrics/networkMetrics');
const { generateTestMetrics } = require('../services/metrics/testData');

logger.info('Initializing API server...');

// Create Express app and server
const app = express();
const server = http.createServer(app);

// Order matters! Define routes in this specific order:

// 1. First middleware and CORS
app.use(cors({
  origin: "*", // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(networkTracker);

// 2. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 3. Static files - serve from public directory
app.use(express.static(path.join(__dirname, '../public')));

// 4. API routes
app.use('/api', require('./routes'));

// 5. Special handling for dashboard and root
app.get(['/dashboard', '/'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 6. Catch-all route should be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Basic error handling
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: true, message: 'Internal server error' });
});


logger.info('API server initialized');

module.exports = { app, server, io };
