import os from 'os';
import diskusage from 'diskusage';
import si from 'systeminformation';
// const logger = require('../../utils/logger').createLogger('systemMetrics');

class SystemMetrics {
    constructor() {
        this.metrics = {
            cpu: 0,
            memory: {
                total: os.totalmem(),
                used: 0,
                free: 0
            },
            disk: {
                total: 0,
                used: 0,
                free: 0,
                usagePercentage: 0
            },
            uptime: 0,
            loadAverage: [0, 0, 0],
            platform: os.platform(),
            hostname: os.hostname(),
            cpuInfo: os.cpus(),
            hardwareInfo: {
                cpuModel: '',
                cpuCores: 0,
                cpuThreads: 0,
                cpuSpeed: '',
                cpuTemperature: 0,
                motherboard: {
                    manufacturer: '',
                    model: ''
                },
                memorySlots: 0,
                gpu: [],
                disks: []
            },
            networkInterfaces: os.networkInterfaces(),
            networkThroughput: {
                bytesSent: 0,
                bytesReceived: 0,
                timestamp: Date.now()
            }
        };

        // Initialize previous network stats
        this.prevNetworkStats = this.getNetworkStats();
        
        // Start collecting metrics immediately
        this.collect();
    }

    async collect() {
        try {
            // Get hardware information
            const cpuInfo = await si.cpu();
            const systemInfo = await si.system();
            const memInfo = await si.memLayout();
            const gpuInfo = await si.graphics();
            const diskLayoutInfo = await si.diskLayout();
            const cpuTemp = await si.cpuTemperature();

            // Update hardware metrics
            this.metrics.hardwareInfo = {
                cpuModel: cpuInfo.manufacturer + ' ' + cpuInfo.brand,
                cpuCores: cpuInfo.cores,
                cpuThreads: cpuInfo.physicalCores,
                cpuSpeed: cpuInfo.speed + ' GHz',
                cpuTemperature: cpuTemp.main || 0,
                motherboard: {
                    manufacturer: systemInfo.manufacturer,
                    model: systemInfo.model
                },
                memorySlots: memInfo.length,
                gpu: gpuInfo.controllers.map(gpu => ({
                    model: gpu.model,
                    vram: gpu.vram,
                    vendor: gpu.vendor
                })),
                disks: diskLayoutInfo.map(disk => ({
                    name: disk.name,
                    type: disk.type,
                    size: (disk.size / (1024 ** 3)).toFixed(2) + ' GB',
                    vendor: disk.vendor
                }))
            };

            // CPU usage calculation
            const cpuUsage = this.calculateCpuUsage();
            
            // Memory usage
            const freeMem = os.freemem();
            const totalMem = os.totalmem();
            const usedMem = totalMem - freeMem;
            
            // Update metrics
            this.metrics = {
                cpu: cpuUsage,
                memory: {
                    total: totalMem,
                    used: usedMem,
                    free: freeMem,
                    usagePercentage: (usedMem / totalMem) * 100
                },
                uptime: process.uptime(),
                osUptime: os.uptime(),
                loadAverage: os.loadavg(),
                platform: os.platform(),
                hostname: os.hostname(),
                cpuInfo: os.cpus(),
                networkInterfaces: os.networkInterfaces(),
                processMemory: process.memoryUsage(),
            diskUsage: {
                total: 0,
                used: 0,
                free: 0,
                usagePercentage: 0
            }
            };

            // Get disk usage
            const diskInfo = await diskusage.check('/');
            this.metrics.disk = {
                total: diskInfo.total,
                used: diskInfo.total - diskInfo.free,
                free: diskInfo.free,
                usagePercentage: ((diskInfo.total - diskInfo.free) / diskInfo.total) * 100
            };
            
            return this.metrics;
        } catch (error) {
            // logger.error('Error collecting system metrics:', error);
            return this.metrics;
        }
    }

    calculateCpuUsage() {
        // Get CPU info
        const cpus = os.cpus();
        
        // Calculate CPU usage as average across all cores
        let totalIdle = 0;
        let totalTick = 0;
        
        for (const cpu of cpus) {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }
        
        // Calculate average CPU usage percentage
        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        const usage = 100 - (idle / total) * 100;
        
        return Math.round(usage * 100) / 100; // Round to 2 decimal places
    }

    getNetworkStats() {
        const interfaces = os.networkInterfaces();
        let bytesSent = 0;
        let bytesReceived = 0;
        
        Object.values(interfaces).forEach(iface => {
            iface.forEach(entry => {
                if (!entry.internal) {
                    bytesSent += entry.bytesSent || 0;
                    bytesReceived += entry.bytesReceived || 0;
                }
            });
        });
        
        return { bytesSent, bytesReceived };
    }

    calculateNetworkThroughput() {
        const currentStats = this.getNetworkStats();
        const timeDiff = Date.now() - this.metrics.networkThroughput.timestamp;
        
        const throughput = {
            bytesSent: currentStats.bytesSent - this.prevNetworkStats.bytesSent,
            bytesReceived: currentStats.bytesReceived - this.prevNetworkStats.bytesReceived,
            timestamp: Date.now()
        };
        
        // Update previous stats
        this.prevNetworkStats = currentStats;
        
        return throughput;
    }

    getMetrics() {
        // Update network throughput metrics
        this.metrics.networkThroughput = this.calculateNetworkThroughput();
        return this.metrics;
    }
}

export default new SystemMetrics();
