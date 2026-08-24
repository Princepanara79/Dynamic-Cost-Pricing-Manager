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
router.put('/', authorize(['admin']), updateSettings);
router.get('/users', authorize(['admin']), getUsers);
router.post('/users', authorize(['admin']), createUser);
router.get('/audit-logs', authorize(['admin']), getAuditLogs);

module.exports = router;
