const ServiceRegistry = require('./ServiceRegistry');
const services = require('./servicesBundle');

// Initialize registry with consolidated services
ServiceRegistry.bootstrap(services, {
  logger: require('../utils/logger').createLogger('services'),
  io: require('../index').io
});

module.exports = ServiceRegistry;
