const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define the format of the log messages
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    let meta = '';
    if (metadata) {
      meta = JSON.stringify(metadata);
    }
    return `${timestamp} ${level}: ${message} ${meta}`;
  })
);

// Define the transports for logging
const transports = [
  new winston.transports.Console({
    level: 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      format
    )
  }),
  new winston.transports.File({
    filename: path.join(__dirname, '../../data/logs/error.log'),
    level: 'error',
    format: format
  }),
  new winston.transports.File({
    filename: path.join(__dirname, '../../data/logs/combined.log'),
    level: 'debug',
    format: format
  })
];

// Create the logger instance
const logger = winston.createLogger({
  levels,
  format,
  transports
});

module.exports = {
  createLogger: (serviceName) => {
    return logger.child({ service: serviceName });
  }
};
