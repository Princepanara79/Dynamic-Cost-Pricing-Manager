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
router.post('/', authorize(['admin', 'user']), createComponent);
router.put('/:id', authorize(['admin', 'user']), updateComponent);
router.post('/:id/duplicate', authorize(['admin', 'user']), duplicateComponent);
router.delete('/:id', authorize(['admin']), deleteComponent);

module.exports = router;
