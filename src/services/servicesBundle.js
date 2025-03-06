// import AgentsService from './agentsService.js';
import llmService from './llmService.js';
// import LogService from './logService.js';
import metricsCollector from './MetricsCollector.js';
// import MetricsService from './metricsService.js';
// import ModelsService from './modelsService.js';
// import ProjectManager from './projectManager.js';
// import SettingsService from './settingsService.js';
// import ToolService from './toolService.js';
// import UplinkService from './uplinkService.js';
// import UsersService from './usersService.js';
// import WorkflowsService from './workflowsService.js';

class CoreServices {
  constructor() {
    this.services = {
      // agents: new AgentsService(),
      llm: llmService,
      // logs: new LogService(),
      metrics: {
        collector: metricsCollector,
        // service: new MetricsService()
      },
      // models: new ModelsService(),
      // projects: new ProjectManager(),
      // settings: new SettingsService(),
      // tools: new ToolService(),
      // uplink: new UplinkService(),
      // users: new UsersService(),
      // workflows: new WorkflowsService()
    };

    this.initOrder = [
      'settings',
      'logs',
      'metrics.collector',
      'models',
      'llm',
      // 'agents',
      'workflows',
      'tools',
      'uplink',
      'users'
    ];
  }

  init() {
    this.initOrder.forEach(servicePath => {
      const service = this.getService(servicePath);
      if (service && typeof service.init === 'function') {
        service.init(this);
      }
    });
  }

  getService(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.services);
  }

  get all() {
    return this.services;
  }
}

export default new CoreServices();
