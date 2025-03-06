const express = require('express');
const router = express.Router();
const toolService = require('../../services/toolService');
const workflowsService = require('../../services/workflowsService');
const agentsService = require('../../services/agentsService');

// Tool routes
router.get('/tools', async (req, res) => {
  try {
    const tools = await toolService.getTools();
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Workflow routes
router.get('/workflows', async (req, res) => {
  try {
    const workflows = await workflowsService.getWorkflows();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent routes
router.get('/agents', async (req, res) => {
  try {
    const agents = await agentsService.getAgents();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
