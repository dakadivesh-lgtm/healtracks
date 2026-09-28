const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');
const { authenticateToken } = require('../middleware/auth');

// All record routes require authentication
router.use(authenticateToken);

// List user records
router.get('/', recordController.getRecords);

// Private image view and download
router.get('/image/:filename', recordController.getPrivateImage);
router.get('/download-image/:filename', recordController.downloadRecordImage);

// Download clinical text report
router.get('/download-report/:id', recordController.downloadRecordReport);

module.exports = router;
