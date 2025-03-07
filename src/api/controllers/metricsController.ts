import express from 'express';
import type { Request, Response } from 'express';
import os from 'os';
import { execSync } from 'child_process';

export const getSystemMetrics = (req: Request, res: Response) => {
  try {
    const cpuInfo = os.cpus()[0];
    const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    
    const metrics = {
      cpu: {
        manufacturer: cpuInfo.model.split(' ')[0],
        model: cpuInfo.model,
        speed: `${cpuInfo.speed} MHz`,
        cores: os.cpus().length
      },
      memory: {
        total: `${totalMemGB} GB`,
        free: `${freeMemGB} GB`,
        used: `${(parseFloat(totalMemGB) - parseFloat(freeMemGB)).toFixed(2)} GB`
      },
      system: {
        uptime: process.uptime(),
        osUptime: os.uptime(),
        hostname: os.hostname(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system metrics' });
  }
};
