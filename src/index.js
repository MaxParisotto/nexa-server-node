import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import services from './services/servicesBundle.js';
import middlewareBundle from './api/middleware/middlewareBundle.js';

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const app = express();
  const server = http.createServer(app);

  // Initialize services first for dependency resolution
  services.init();
  
  // Apply consolidated middleware stack
  app.use(middlewareBundle.applyMiddlewares());

  // Core HTTP middleware
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json());

  // Static files first
  const publicPath = path.join(__dirname, 'public');
  app.use(express.static(publicPath));

  // Consolidated API routes
  app.use('/api', (await import('./api/routes/index.js')).default);
  
  // Remove legacy route references
  // SPA routes
  app.get(['/', '/dashboard'], (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // Unified error handling via services
  app.use((err, req, res, next) => {
    services.getService('logs').error('Request error', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Socket.IO setup with metrics
  const io = new Server(server, {
    cors: { origin: "*" },
    transports: ['polling', 'websocket']
  });

  // Initialize unified metrics service
  try {
    // Use dynamic import for CommonJS modules
    const metricsServiceModule = await import('./services/metrics/MetricsService.js');
    const metricsService = metricsServiceModule.default;
    if (metricsService && typeof metricsService.init === 'function') {
      metricsService.init(io);
    } else {
      console.warn('MetricsService not available or init method not found');
    }
  } catch (error) {
    console.error('Error loading MetricsService:', error);
  }

  io.on('connection', socket => {
    console.log('Socket connected', { 
      socketId: socket.id,
      address: socket.handshake.address
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected', { socketId: socket.id });
    });

    socket.on('error', (error) => {
      console.error('Socket error', error, { socketId: socket.id });
    });
  });

  // Start server
  const PORT = process.env.PORT || 3001;
  const HOST = process.env.HOST || '0.0.0.0';

  // Log startup information
  server.listen(PORT, HOST, () => {
    console.log('Server started', {
      port: PORT,
      host: HOST,
      env: process.env.NODE_ENV,
      nodeVersion: process.version
    });
  });

} catch (error) {
  console.error('Fatal startup error', error);
  process.exit(1);
}
