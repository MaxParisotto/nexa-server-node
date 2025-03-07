import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bodyParser from 'body-parser';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Debug route registration
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Register routes safely with validation
const safeRoute = (method, routePath, handler) => {
  // Validate route path to avoid path-to-regexp errors
  if (typeof routePath !== 'string' || routePath.includes(':') && !routePath.match(/:[a-zA-Z0-9_]+/g)) {
    console.error(`Invalid route path: ${routePath}`);
    return;
  }
  
  try {
    console.log(`Registering route: ${method.toUpperCase()} ${routePath}`);
    app[method](routePath, handler);
  } catch (error) {
    console.error(`Error registering route ${method.toUpperCase()} ${routePath}:`, error);
  }
};

// API routes
safeRoute('get', '/api/status', (req, res) => {
  res.json({ status: 'online', timestamp: new Date() });
});

safeRoute('get', '/api/metrics', (req, res) => {
  res.json({
    cpu: Math.random() * 100,
    memory: Math.random() * 100,
    requests: Math.floor(Math.random() * 200),
    llmLatency: Math.random() * 1000
  });
});

safeRoute('get', '/api/functions', (req, res) => {
  res.json([
    { name: 'textProcessing', calls: Math.floor(Math.random() * 100), avgTime: Math.random() * 500 },
    { name: 'dataAnalysis', calls: Math.floor(Math.random() * 100), avgTime: Math.random() * 500 },
    { name: 'modelInference', calls: Math.floor(Math.random() * 100), avgTime: Math.random() * 500 }
  ]);
});

// API route for route visualization
safeRoute('get', '/api/routes', (req, res) => {
  const routes = [];
  
  try {
    app._router.stack.forEach(middleware => {
      if (middleware.route) {
        // Routes registered directly
        const path = middleware.route.path;
        const methods = Object.keys(middleware.route.methods);
        
        methods.forEach(method => {
          routes.push({ path, method: method.toUpperCase() });
        });
      } else if (middleware.name === 'router') {
        // Router middleware
        try {
          middleware.handle.stack.forEach(handler => {
            if (handler.route) {
              const path = handler.route.path;
              const methods = Object.keys(handler.route.methods);
              
              methods.forEach(method => {
                routes.push({ path, method: method.toUpperCase() });
              });
            }
          });
        } catch (err) {
          console.error('Error processing router middleware:', err);
        }
      }
    });
    
    res.json(routes);
  } catch (error) {
    console.error('Error extracting routes:', error);
    res.status(500).json({ error: 'Failed to extract routes' });
  }
});

// Use a regular index route instead of wildcard to avoid path-to-regexp issues
safeRoute('get', '/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Specific fallback routes instead of wildcard
safeRoute('get', '/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Finally add a 404 handler
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url}`);
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

export default app;
