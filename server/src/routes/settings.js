const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getSettings,
  updateSettings,
  getUsers,
  createUser,
  getAuditLogs
} = require('../controllers/settingsController');

router.use(authenticate);

router.get('/', getSettings);
router.put('/', authorize(['manufacturer_admin', 'super_admin']), updateSettings);
router.get('/users', authorize(['manufacturer_admin', 'super_admin']), getUsers);
router.post('/users', authorize(['manufacturer_admin', 'super_admin']), createUser);
router.get('/audit-logs', authorize(['manufacturer_admin', 'super_admin']), getAuditLogs);

module.exports = router;
