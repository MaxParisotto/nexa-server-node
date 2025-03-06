const ServiceRegistry = require('./ServiceRegistry');

class CoreServices {
  static initialize() {
    return {
      logger: ServiceRegistry.getService('log'),
      metrics: ServiceRegistry.getService('metrics'),
      settings: ServiceRegistry.getService('settings')
    };
  }
}

module.exports = CoreServices;
