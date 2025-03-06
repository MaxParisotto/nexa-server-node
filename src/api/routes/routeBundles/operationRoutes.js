const express = require('express');
const router = express.Router();
const { handleAsync } = require('../middleware/core/middleware');
const backupService = require('../../services/settingsService');
const uplinkService = require('../../services/uplinkService');
const agentsService = require('../../services/agentsService');
const workflowService = require('../../services/workflowsService');

// Consolidated system operations endpoints
router.post('/backup/create', handleAsync(async (req, res) => {
  const backupId = await backupService.createSystemBackup();
  res.json({ backupId, status: 'created' });
}));

router.post('/uplink/sync', handleAsync(async (req, res) => {
  const syncResult = await uplinkService.syncWithCentral();
  res.json(syncResult);
}));

router.get('/agents', handleAsync(async (req, res) => {
  const agents = await agentsService.listRegisteredAgents();
  res.json(agents);
}));

router.get('/workflows', handleAsync(async (req, res) => {
  const workflows = await workflowService.getActiveWorkflows();
  res.json(workflows);
}));

// Network configuration endpoints
router.get('/config/network', handleAsync(async (req, res) => {
  const networkConfig = await require('../../utils/networkInfo').getNetworkConfig();
  res.json(networkConfig);
}));

router.put('/config/update', handleAsync(async (req, res) => {
  const updateResult = await require('../../services/config').updateRuntimeConfig(req.body);
  res.json(updateResult);
}));

module.exports = router;
