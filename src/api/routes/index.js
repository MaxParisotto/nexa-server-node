import express from 'express';
// import { createLogger } from '../../utils/logger.js';
// const logger = createLogger('routes');
// We'll use dynamic import for logs.js since it's using CommonJS

const router = express.Router();

// Basic health check route
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Simple API routes
const routes = {};

// Use dynamic imports for route bundles
try {
  routes.management = (await import('./routeBundles/managementRoutes.js')).default;
  console.log('Mounted route: management');
} catch (err) {
  console.warn(`Failed to mount route management:`, err.message);
}

try {
  routes.monitoring = (await import('./routeBundles/monitoringRoutes.js')).default;
  console.log('Mounted route: monitoring');
} catch (err) {
  console.warn(`Failed to mount route monitoring:`, err.message);
}

try {
  routes.operations = (await import('./routeBundles/operationRoutes.js')).default;
  console.log('Mounted route: operations');
} catch (err) {
  console.warn(`Failed to mount route operations:`, err.message);
}

// Mount each route module
Object.entries(routes).forEach(([name, handler]) => {
  if (handler) {
    try {
      router.use('/' + name, handler);
      console.log(`Mounted route: ${name}`);
    } catch (err) {
      console.warn(`Failed to mount route ${name}:`, err.message);
    }
  }
});

// Add logs routes
try {
  // Use dynamic import for logs.js (CommonJS module)
  const logsModule = await import('./logs.js');
  router.use('/logs', logsModule.default);
  console.log('Mounted route: logs');
} catch (err) {
  console.warn(`Failed to mount logs route:`, err.message);
}

// Basic error handler
router.use((err, req, res, next) => {
  console.error('Route error:', err);
  res.status(500).json({
    error: true,
    message: 'Internal server error'
  });
});

export default router;
