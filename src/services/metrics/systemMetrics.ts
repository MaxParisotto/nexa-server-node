import os from 'os';
const { MetricsCollector } = require('../MetricsCollector');

export class SystemMetrics {
  private collector: MetricsCollector;

  constructor(collector: MetricsCollector) {
    this.collector = collector;
  }

  async collect() {
    const metrics = {
      cpu: {
        manufacturer: os.cpus()[0].model.split(' ')[0],
        cores: os.cpus().length,
        speed: os.cpus()[0].speed
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem()
      },
      os: {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        arch: os.arch()
      },
      uptime: os.uptime()
    };

    this.collector.record('system', metrics);
    return metrics;
  }
}
