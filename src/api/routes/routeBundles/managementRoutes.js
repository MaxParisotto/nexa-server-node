import { Router } from 'express';
// No matching file found, consider correcting or creating the missing controller
import backupController from '../../controllers/backupController';
import configController from '../../controllers/configController';
import agentsController from '../../controllers/agentsController';

const router = Router();

// Agent management
router.get('/agents', agentsController.list);
router.post('/agents', agentsController.create);
router.put('/agents/:id', agentsController.update);

// Backup management  
router.post('/backup/create', backupController.create);
router.get('/backup/list', backupController.list);

// Configuration
router.get('/config', configController.get);
router.post('/config', configController.update);

export default router;
