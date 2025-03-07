const winston = require('winston');
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');
const os = require('os');
const fs = require('fs');

// Enhanced log levels with better organization
const levels = {
  emergency: 0,
  alert: 1,
  critical: 2,
  error: 3,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7,
  trace: 8
};

// Performance-optimized logging format with better metadata handling
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.metadata({
    fill: true,
    replace: false,
    ignore: ['timestamp', 'level', 'message']
  }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    const meta = metadata ? ` | ${JSON.stringify(metadata, null, 2)}` : '';
    return `[${level.toUpperCase()}] ${timestamp} - ${message}${meta}`;
  })
);

// Configure transports with better performance and organization
const transports = [
  // Real-time logging transport with improved handling
  {
    level: 'info',
    handleInfo: (info, _, callback) => {
      if (global.socketIO) {
        const formattedLog = {
          timestamp: info.timestamp,
          level: info.level,
          message: info.message,
          metadata: info.metadata || {}
        };
        global.socketIO.to('logs_channel').emit('log_update', formattedLog);
      }
      callback(null, true);
    }
  },
  
  // Enhanced file transports with rotation and archiving
  new DailyRotateFile({
    filename: path.join(__dirname, '../../data/logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    level: 'error',
    format,
    handleExceptions: true,
    maxFiles: '14d' // Keep error logs for 14 days
  }),
  new DailyRotateFile({
    filename: path.join(__dirname, '../../data/logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    level: 'debug',
    format,
    handleExceptions: true,
    maxFiles: '30d' // Keep combined logs for 30 days
  }),
  
  new winston.transports.Console({
    level: 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      format
    )
  }),
  new DailyRotateFile({
    filename: path.join(__dirname, '../../data/logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    level: 'error',
    format
  }),
  new DailyRotateFile({
    filename: path.join(__dirname, '../../data/logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    level: 'debug',
    format
  })
];

// Performance optimizations - implement async logging queue with enhanced monitoring
const { Queue } = require('winston-queue');
const queue = new Queue({
  concurrency: 5,
  maxRetries: 3,
  retryDelay: 1000,
  monitor: true
});

// Configure Winston to use the queue transport with performance tweaks
const queueTransport = {
  handleInfo(info, _, callback) {
    try {
      queue.write(info);
      callback(null, true);
    } catch (error) {
      console.error('Queue write error:', error);
      callback(error, false);
    }
  }
};

// Environment-specific logging configuration
const environment = process.env.NODE_ENV || 'development';

// Configure logging based on environment
let envTransports = [...transports, queueTransport];

if (environment === 'production') {
  // Production settings - more restrictive
  envTransports = [
    ...envTransports.filter(t => t.level <= levels.warning),
    {
      level: 'error',
      handleInfo: async (info, _, callback) => {
        try {
          // Implement error reporting to external services here
          const errorReport = {
            timestamp: info.timestamp,
            level: info.level,
            message: info.message,
            metadata: info.metadata || {},
            environment: environment
          };
          
          // Example: Send error to external monitoring service
          try {
            await fetch('https://api.example.com/log/error', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`
              },
              body: JSON.stringify(errorReport)
            });
          } catch (fetchError) {
            console.error('Failed to send error to monitoring service:', fetchError);
          }

          callback(null, true);
        } catch (error) {
          console.error('Failed to report error:', error);
          callback(error, false);
        }
      }
    }
  ];
  
  // Add log level filtering
  envTransports.forEach(transport => {
    if (transport.level) {
      transport.level = Math.min(transport.level, levels.warning);
    }
  });
} else if (environment === 'testing') {
  envTransports = [
    ...envTransports.filter(t => t.level <= levels.error)
  ];
  
  // Add log level filtering
  envTransports.forEach(transport => {
    if (transport.level) {
      transport.level = Math.min(transport.level, levels.error);
    }
  });
}
        method: 'POST',
        headers: {
// Create the logger instance with async support and environment-specific configuration
const logger = winston.createLogger({
  levels,
  format,
  transports: envTransports,
  exitOnError: false, // Prevent process exit on logging errors
  silent: environment === 'testing' // Disable logging in testing environment
});

// Log performance metrics
setInterval(() => {
  try {
    const stats = queue.getStats();
    
    if (stats) {
      logger.info('Logging queue statistics:', {
        pending: stats.pending,
        processing: stats.processing,
        completed: stats.completed,
        failed: stats.failed,
        retryCount: stats.retryCount
      });
    }
  } catch (error) {
    logger.error('Failed to retrieve logging queue statistics', { error: error.message });
  }
}, 60000); // Report every minute
        })
      }).catch(err => {
        console.error('Failed to report logging error:', err);
      });
    }
  } catch (error) {
    console.error('Error handling logging error:', error);
  }
});

// Log context enrichment middleware with correlation support
logger.use((level, message, meta) => {
  try {
    const enrichedMeta = {
      ...meta,
      environment: environment,
      hostname: os.hostname(),
      timestamp: new Date().toISOString()
    };

    // Correlation ID handling
    if (global.requestContext && global.requestContext.requestId) {
      enrichedMeta.requestId = global.requestContext.requestId;
    } else if (!enrichedMeta.requestId) {
      enrichedMeta.requestId = uuid.v4();
    }

    // Add trace ID for distributed tracing
    const traceId = global.traceContext?.traceId || uuid.v4();
    enrichedMeta.traceId = traceId;

    return { level, message, meta: enrichedMeta };
  } catch (error) {
    console.error('Error enriching log context:', error);
    return { level, message, meta };
  }
});

// Implement log file cleanup schedule
const cleanupLogs = async () => {
  try {
    const logDirectory = path.join(__dirname, '../../data/logs');
    const files = await fs.promises.readdir(logDirectory);
    
    for (const file of files) {
      if (!file.startsWith('combined-') && !file.startsWith('error-')) continue;
      
      const filePath = path.join(logDirectory, file);
      const stats = await fs.promises.stat(filePath);
      const now = new Date();
      
      // Determine max allowed age based on file type
      const maxDays = file.startsWith('error-') ? 14 : 30;
      const cutoffDate = new Date(now.getTime() - (maxDays * 24 * 60 * 60 * 1000));
      
      if (stats.mtime < cutoffDate) {
        await fs.promises.unlink(filePath);
        console.log(`Deleted old log file: ${file}`);
      }
    }
    
    // Schedule next cleanup in 24 hours
    setTimeout(cleanupLogs, 86400 * 1000);
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    setTimeout(cleanupLogs, 3600 * 1000); // Retry after 1 hour
  }
};

// Start log cleanup process
cleanupLogs();

// Dashboard integration - add methods for querying logs
logger.dashboard = {
  getRecentLogs: async (count = 100, filters = {}) => {
    try {
      const logFiles = await fs.promises.readdir(path.join(__dirname, '../../data/logs'));
      const combinedLog = logFiles.find(f => f.startsWith('combined-') && f.endsWith('.log'));
      
      if (!combinedLog) return [];
      
      const logsPath = path.join(__dirname, '../../data/logs', combinedLog);
      const fileContent = await fs.promises.readFile(logsPath, 'utf8');
      const lines = fileContent.split('\n').reverse().slice(0, count).reverse();
      
      return lines.map(line => {
        try {
          const parts = line.match(/\[(\w+)\] (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.?\d*) - (.*)/);
          if (!parts) return null;
          
          const logEntry = {
            level: parts[1],
            timestamp: parts[2],
            message: parts[3]
          };
          
          // Attempt to parse metadata
          const metaMatch = parts[3].match(/\| (.*)$/);
          if (metaMatch) {
            try {
              logEntry.metadata = JSON.parse(metaMatch[1]);
              logEntry.message = parts[3].replace(` | ${metaMatch[1]}`, '');
            } catch(e) {}
          }

          // Apply filters
          let include = true;
          
          if (filters.levels && !filters.levels.includes(logEntry.level)) {
            include = false;
          }
          
          if (filters.requestId && logEntry.metadata?.requestId !== filters.requestId) {
            include = false;
          }
          
          if (filters.traceId && logEntry.metadata?.traceId !== filters.traceId) {
            include = false;
          }

          if (filters.messageKeyword && !logEntry.message.includes(filters.messageKeyword)) {
            include = false;
          }

          return include ? logEntry : null;
        } catch(e) {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      console.error('Error fetching recent logs:', error);
      return [];
    }
  },

  getLogStats: async () => {
    try {
      const logFiles = await fs.promises.readdir(path.join(__dirname, '../../data/logs'));
      const stats = {
        totalLogs: 0,
        errorsToday: 0,
        warningsToday: 0,
        infoToday: 0
      };
      // Process combined logs
      // Process combined logs
      const errorLog = logFiles.find(f => f.startsWith('error-') && f.endsWith('.log'));
      const combinedLog = logFiles.find(f => f.startsWith('combined-') && f.endsWith('.log'));
      if (errorLog) {
        const errorLogsPath = path.join(__dirname, '../../data/logs', errorLog);
        const errorContent = await fs.promises.readFile(errorLogsPath, 'utf8');
        stats.errorsToday = (errorContent.match(/ERROR/gi) || []).length;
      }

      if (combinedLog) {
        const combinedLogsPath = path.join(__dirname, '../../data/logs', combinedLog);
        const combinedContent = await fs.promises.readFile(combinedLogsPath, 'utf8');
        
        stats.totalLogs = combinedContent.split('\n').length - 1; // Exclude empty lines
        stats.warningsToday = (combinedContent.match(/WARNING/gi) || []).length;
        stats.infoToday = (combinedContent.match(/INFO/gi) || []).length;
      }

      return stats;
    } catch (error) {
      console.error('Error fetching log stats:', error);
      return null;
    }
  },

  // Enhanced dashboard methods
  getLogTrend: async (period = '24h') => {
    try {
      const logFiles = await fs.promises.readdir(path.join(__dirname, '../../data/logs'));
      const combinedLogs = logFiles.filter(f => f.startsWith('combined-') && f.endsWith('.log'));

      const timeFrame = {
        '1h': 60,
        '24h': 1440,
        '7d': 10080,
        '30d': 43200
      }[period] || 1440; // Default to 24h

      const currentTime = new Date();
      const cutoffTime = new Date(currentTime.getTime() - timeFrame * 60 * 1000);

      const trends = {
        error: 0,
        warning: 0,
        info: 0
      };

      for (const logFile of combinedLogs) {
        const filePath = path.join(__dirname, '../../data/logs', logFile);
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const lines = fileContent.split('\n');

        for (const line of lines) {
          try {
            const timestampStr = line.match(/\[(\w+)\] (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.?\d*) - (.*)/)?.[2];
            if (!timestampStr) continue;

            const logTime = new Date(timestampStr);
            if (logTime < cutoffTime) break; // Stop processing older logs

            const levelMatch = line.match(/\[(\w+)\]/);
            if (levelMatch) {
              const level = levelMatch[1].toLowerCase();
              if (trends[level]) trends[level]++;
            }
          } catch(e) {}
        }
      }

      return trends;
    } catch (error) {
      console.error('Error fetching log trends:', error);
      return null;
    }
  },

  getLogDistribution: async () => {
    try {
      const logFiles = await fs.promises.readdir(path.join(__dirname, '../../data/logs'));
      const combinedLogs = logFiles.filter(f => f.startsWith('combined-') && f.endsWith('.log'));

      const distribution = {};

      for (const logFile of combinedLogs) {
        const filePath = path.join(__dirname, '../../data/logs', logFile);
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const lines = fileContent.split('\n');

        for (const line of lines) {
          try {
            const parts = line.match(/\[(\w+)\] (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.?\d*) - (.*)/);
            if (!parts) continue;

            const level = parts[1].toLowerCase();
            distribution[level] = (distribution[level] || 0) + 1;
          } catch(e) {}
        }
      }

      return distribution;
    } catch (error) {
      console.error('Error fetching log distribution:', error);
      return null;
    }
  },

  getLogHeatmap: async () => {
    try {
      const logFiles = await fs.promises.readdir(path.join(__dirname, '../../data/logs'));
      const combinedLogs = logFiles.filter(f => f.startsWith('combined-') && f.endsWith('.log'));

      const heatmap = {};

      for (const logFile of combinedLogs) {
        const filePath = path.join(__dirname, '../../data/logs', logFile);
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const lines = fileContent.split('\n');

        for (const line of lines) {
          try {
            const timestampStr = line.match(/\[(\w+)\] (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.?\d*) - (.*)/)?.[2];
            if (!timestampStr) continue;

            const logTime = new Date(timestampStr);
            const hour = logTime.getHours();
            const minute = logTime.getMinutes();

            const key = `${hour}:${minute}`;
            heatmap[key] = (heatmap[key] || 0) + 1;
          } catch(e) {}
        }
      }

      return heatmap;
    } catch (error) {
      console.error('Error fetching log heatmap:', error);
      return null;
    }
  }
};

// Request tracing support
const uuid = require('uuid');

module.exports = {
  createLogger: (serviceName) => {
    const childLogger = logger.child({ service: serviceName });
    
    // Add real-time transport dynamically
    childLogger.add({
      level: 'info',
      handleInfo: (info, _, callback) => {
        global.socketIO?.to('logs_channel').emit('log_update', info);
        callback(null, true);
      }
    });

    // Enhance with request tracing context
    const tracedLogger = winston.createLogger({
      transports: childLogger.transports,
      levels: childLogger.levels,
      format: childLogger.format,
      exitOnError: false
    });

    tracedLogger.addContext('requestId', () => {
      return uuid.v4();
    });

    return tracedLogger;
  }
};
