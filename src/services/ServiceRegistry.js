const logger = require('../utils/logger'); 

class ServiceRegistry {
  static services = {
    log: null,
    metrics: null,
    settings: null,
    uplink: null,
    workflows: null,
    tools: null,
    users: null,
    agents: null,
    llm: null,
    projectManager: null
  };

  static init({ logger, io }) {
    // Initialize core services
    this.services.log = new (require('./logService'))(logger);
    this.services.metrics = new (require('./metricsService'))(io);
    this.services.settings = new (require('./settingsService'))();
    
    // Initialize dependent services
    this.services.llm = new (require('./llmService'))(
      this.services.log,
      this.services.metrics
    );
    
    this.services.users = new (require('./usersService'))(
      this.services.log,
      this.services.settings
    );

    // Initialize remaining services
    this.services.workflows = new (require('./workflowsService'))();
    this.services.tools = new (require('./toolService'))();
    this.services.agents = new (require('./agentsService'))(
      this.services.llm,
      this.services.metrics
    );
    
    logger.info('Service registry initialized with:', Object.keys(this.services));
  }

  static getService(name) {
    if (!this.services[name]) {
      throw new Error(`Service ${name} not registered`);
    }
    return this.services[name];
  }
}

module.exports = ServiceRegistry;
