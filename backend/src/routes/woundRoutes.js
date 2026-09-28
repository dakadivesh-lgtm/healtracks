const express = require('express');
const router = express.Router();
const woundController = require('../controllers/woundController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All wound routes require authentication
router.use(authenticateToken);

// Dashboard data endpoint
router.get('/dashboard', woundController.getDashboard);

// Wounds management
router.get('/', woundController.listWounds);
router.get('/:id', woundController.getWoundDetail);
router.get('/:id/comparison/:entryId', woundController.getWoundComparison);
router.post('/upload', upload.single('image'), woundController.uploadWound);
router.patch('/entries/:entryId/measurements', woundController.updateEntryMeasurements);
router.patch('/entries/:entryId/symptoms', woundController.updateEntrySymptoms);
router.delete('/:id', woundController.deleteWound);

module.exports = router;
