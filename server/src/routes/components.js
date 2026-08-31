const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getComponents,
  getComponentById,
  createComponent,
  updateComponent,
  duplicateComponent,
  deleteComponent
} = require('../controllers/componentController');

router.use(authenticate);

router.get('/', getComponents);
router.get('/:id', getComponentById);
router.post('/', authorize(['manufacturer_admin', 'manufacturer', 'super_admin']), createComponent);
router.put('/:id', authorize(['manufacturer_admin', 'manufacturer', 'super_admin']), updateComponent);
router.post('/:id/duplicate', authorize(['manufacturer_admin', 'manufacturer', 'super_admin']), duplicateComponent);
router.delete('/:id', authorize(['manufacturer_admin', 'super_admin']), deleteComponent);

module.exports = router;
