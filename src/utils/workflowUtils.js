/**
 * Centralized response handling for workflow endpoints
 */

const handleWorkflowResponse = (res, data, options = {}) => {
  const { status = 200, pagination } = options;
  
  // Set common headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Response-Handler', 'workflowUtils');
  
  // Handle paginated responses
  if (pagination) {
    return res.status(status).json({
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: pagination.totalItems,
        totalPages: Math.ceil(pagination.totalItems / pagination.pageSize)
      }
    });
  }

  // Standard response
  res.status(status).json({ data });
};

const handleWorkflowError = (res, error, context = '') => {
  console.error(`[Workflow Error] ${context}:`, error);
  
  const status = error.statusCode || 500;
  const message = error.message || 'An unexpected error occurred';
  
  res.status(status).json({
    error: {
      message,
      context,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = {
  handleWorkflowResponse,
  handleWorkflowError
};
