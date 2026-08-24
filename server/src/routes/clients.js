const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getAllClientsProfitAnalysis
} = require('../controllers/clientController');

router.use(authenticate);

router.get('/profit-analysis', getAllClientsProfitAnalysis);
router.get('/', getClients);
router.get('/:id', getClientById);
router.post('/', authorize(['admin', 'user']), createClient);
router.put('/:id', authorize(['admin', 'user']), updateClient);
router.delete('/:id', authorize(['admin']), deleteClient);

module.exports = router;
