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
router.post('/', authorize(['manufacturer_admin', 'manufacturer', 'super_admin']), createClient);
router.put('/:id', authorize(['manufacturer_admin', 'manufacturer', 'super_admin']), updateClient);
router.delete('/:id', authorize(['manufacturer_admin', 'super_admin']), deleteClient);

module.exports = router;
