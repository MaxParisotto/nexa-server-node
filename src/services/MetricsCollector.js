// import { createLogger } from '../utils/logger.js';
// const logger = createLogger('MetricsCollector');

import networkMetrics from './metrics/networkMetrics.js';
import llmMetrics from './metrics/llmMetrics.js';
import systemMetrics from './metrics/systemMetrics.js';
// const toolService = require('./toolService');

class MetricsCollector {
    constructor() {
        this.metrics = {
            summary: {},
            llm: {},
            network: {},
            system: {}
        };
        
        // Initialize metrics collectors
        this.llmMetricsCollector = llmMetrics;
        this.systemMetricsCollector = systemMetrics;
        
        // Network metrics is already a singleton instance
        this.networkMetricsCollector = networkMetrics;
    }

    async collectMetrics() {
        try {
            // Collect system metrics
            const systemMetrics = await this.systemMetricsCollector.collect();
            
            // Collect LLM metrics
            const llmMetrics = await this.llmMetricsCollector.collect();
            
            // Collect network metrics
            const networkMetricsData = this.networkMetricsCollector.getMetrics();
            
            // Update summary metrics
            const summary = this.generateSummary(systemMetrics, llmMetrics, networkMetricsData);
            
            // Update all metrics
            this.metrics = {
                timestamp: new Date().toISOString(),
                summary,
                system: systemMetrics,
                llm: llmMetrics,
                network: networkMetricsData
            };
            
            return this.metrics;
        } catch (error) {
            // logger.error('Error collecting metrics:', error);
        }
    }
    
    generateSummary(systemMetrics, llmMetrics, networkMetrics) {
        // Generate summary metrics from all collected metrics
        return {
            activeAgents: llmMetrics.requestCount || 0,
            // activeTools: toolService.getActiveToolCount() || 0,
            apiHealth: networkMetrics.summary.errorRate < 5 ? 'OK' : 'Degraded',
            totalRequests: networkMetrics.summary.requestsPerSecond || 0,
            cpuUsage: systemMetrics.cpu || 0,
            memoryUsage: systemMetrics.memory?.used || 0,
            uptime: systemMetrics.uptime || 0
        };
    }
    
    // Track an LLM request
    trackLLMRequest(model, requestData) {
        return this.llmMetricsCollector.trackRequest(model, requestData);
    }
    
    // Track a network request
    trackNetworkRequest(path, method, startTime, bytesIn) {
        return this.networkMetricsCollector.trackRequest(path, method, startTime, bytesIn);
    }
    
    // Track a network response
    trackNetworkResponse(bytesOut, statusCode, duration) {
        return this.networkMetricsCollector.trackResponse(bytesOut, statusCode, duration);
    }
}

export default new MetricsCollector();
