const express = require('express');
const router = express.Router();
const agentsService = require('../../services/agentsService');
const toolService = require('../../services/toolService');
const workflowsService = require('../../services/workflowsService');
const uplinkService = require('../../services/uplinkService');

// Agents routes
router.get('/agents', async (req, res) => {
  try {
    const agents = await agentsService.getAgents();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tools routes
router.get('/tools', async (req, res) => {
  try {
    const tools = await toolService.getTools();
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Workflows routes
router.get('/workflows', async (req, res) => {
  try {
    const workflows = await workflowsService.getWorkflows();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Uplink routes
router.get('/uplink/status', async (req, res) => {
  try {
    const status = await uplinkService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
