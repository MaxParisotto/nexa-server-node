const express = require('express');
const router = express.Router();
const usersService = require('../../services/usersService');
const settingsService = require('../../services/settingsService');
const configService = require('../../services/config');

// User routes
router.get('/users', async (req, res) => {
  try {
    const users = await usersService.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings routes
router.get('/settings', async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Config routes
router.get('/config', async (req, res) => {
  try {
    const config = await configService.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
