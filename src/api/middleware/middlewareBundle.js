// import apiMiddleware from './apiMiddleware.js';
// import errorHandler from './errorHandler.js';
// import logging from './logging.js';
// import metricsProxy from './metricsProxyMiddleware.js';
// import { metricsCore } from './core/metricsCore.js';

// Consolidated debug utilities
const debugMiddleware = {
  inspectPayloads: (req, res, next) => {
    console.debug('Request payload:', req.body);
    next();
  }
};

// Consolidated network monitoring
const networkTracker = {
  trackBandwidth: (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`Request to ${req.path} took ${duration}ms`);
    });
    next();
  }
};

// Consolidated performance tools
const performanceMonitor = {
  measureTTFB: (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ttfb = Date.now() - start;
      console.log(`Time to first byte: ${ttfb}ms`);
    });
    next();
  }
};

const middlewareBundle = {
  init: () => {
    // Initialize core metrics first
    // metricsCore.initialize();

    // Return middleware chain with proper ordering
    return [
      // logging,
      // errorHandler,
      // networkTracker,
      // performanceMonitor,
      // metricsProxy,
      // debugMiddleware,
      // apiMiddleware
    ];
  },

  applyMiddlewares: (app) => {
    const middlewares = middlewareBundle.init();
    if (middlewares && middlewares.length > 0) {
      middlewares.forEach(middleware => app.use(middleware));
    }
    return (req, res, next) => next(); // Return a passthrough middleware if no middlewares are defined
  },

  // metricsCore // Expose core metrics for direct access
};

export default middlewareBundle;
