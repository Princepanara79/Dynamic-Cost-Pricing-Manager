const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  simulateCost,
  getScenarios,
  saveScenario,
  deleteScenario
} = require('../controllers/whatIfController');

router.use(authenticate);

router.post('/simulate', simulateCost);
router.get('/scenarios', getScenarios);
router.post('/scenarios', saveScenario);
router.delete('/scenarios/:id', deleteScenario);

module.exports = router;
