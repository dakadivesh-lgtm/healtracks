const express = require('express');
const router = express.Router();
const helpController = require('../controllers/helpController');

// POST /api/help/chat
router.post('/chat', helpController.handleChat);

module.exports = router;
