import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import Debug from 'debug';

const debug = Debug('nexa-core:server');

// Enhanced error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Import server from src directory
try {
  // Import app with additional error handling
  console.log('Importing app module...');
  const appImport = await import('./src/app.js').catch(err => {
    console.error('Failed to import app module:', err);
    process.exit(1);
  });
  
  const app = appImport.default;
  console.log('App module imported successfully');

  // Set port
  const port = process.env.PORT || 3001;
  app.set('port', port);

  // Create HTTP server
  const server = http.createServer(app);
  const io = new Server(server);

  // Function to safely extract routes
  function safeExtractRoutes() {
    try {
      if (!app._router || !app._router.stack) {
        console.warn('Router not initialized');
        return [];
      }
      
      const routes = [];
      
      app._router.stack.forEach(middleware => {
        if (middleware.route) {
          // Routes registered directly
          const path = middleware.route.path;
          const methods = Object.keys(middleware.route.methods);
          
          methods.forEach(method => {
            routes.push({ path, method: method.toUpperCase() });
          });
        }
      });
      
      return routes;
    } catch (error) {
      debug(`Error extracting routes: ${error.message}`);
      return [];
    }
  }

  // Socket.io logic for real-time metrics
  io.on('connection', (socket) => {
    debug('Client connected');
    
    // Send system metrics every 3 seconds
    const metricsInterval = setInterval(() => {
      socket.emit('metrics', {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        requests: Math.floor(Math.random() * 200),
        llmLatency: Math.random() * 1000,
        apiCalls: Math.floor(Math.random() * 500)
      });
      
      // Send routes info using the safe extraction method
      try {
        const routes = safeExtractRoutes();
        socket.emit('routes', routes);
      } catch (err) {
        console.error('Error sending routes:', err);
      }
      
      // Send functions info (mock data - replace with actual functions)
      const functions = [
        { name: 'textProcessing', calls: Math.floor(Math.random() * 100), avgTime: Math.random() * 500 },
        { name: 'dataAnalysis', calls: Math.floor(Math.random() * 100), avgTime: Math.random() * 500 },
        { name: 'modelInference', calls: Math.floor(Math.random() * 100), avgTime: Math.random() * 500 }
      ];
      
      socket.emit('functions', functions);
    }, 3000);
    
    socket.on('disconnect', () => {
      clearInterval(metricsInterval);
      debug('Client disconnected');
    });
  });

  // Start server
  server.listen(port, () => {
    debug(`Server running on port ${port}`);
    console.log(`Server running on port ${port}`);
  });

  // Handle exceptions
  process.on('uncaughtException', (error) => {
    debug(`Uncaught Exception: ${error.message}`);
    console.error('Uncaught Exception:', error);
    // Don't exit process in production - just log
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
