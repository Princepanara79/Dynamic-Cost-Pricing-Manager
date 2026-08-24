const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDashboardData } = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/', getDashboardData);

module.exports = router;
