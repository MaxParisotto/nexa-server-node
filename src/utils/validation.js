/**
 * Shared validation utilities for service modules
 */

const logger = require('./logger').createLogger('validation');

/**
 * Validates tool configuration object
 * @param {Object} config - Tool configuration to validate
 * @param {Array} requiredFields - List of required field names
 * @returns {Object} - Validation result { isValid: boolean, errors: Array }
 */
function validateToolConfig(config, requiredFields) {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    return {
      isValid: false,
      errors: ['Configuration must be an object']
    };
  }

  requiredFields.forEach(field => {
    if (!config[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates LLM configuration object
 * @param {Object} config - LLM configuration to validate
 * @returns {Object} - Validation result { isValid: boolean, errors: Array }
 */
function validateLLMConfig(config) {
  const requiredFields = ['model', 'temperature', 'maxTokens'];
  return validateToolConfig(config, requiredFields);
}

module.exports = {
  validateToolConfig,
  validateLLMConfig
};
