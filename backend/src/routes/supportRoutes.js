const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateToken } = require('../middleware/auth');
const { validateSupportTicket } = require('../middleware/validation');

// Optional auth for submitting support tickets (can submit logged in or as visitor)
router.post('/', (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authenticateToken(req, res, () => {
      validateSupportTicket(req, res, () => supportController.submitTicket(req, res, next));
    });
  } else {
    validateSupportTicket(req, res, () => supportController.submitTicket(req, res, next));
  }
});

// Authenticated user can view tickets
router.get('/my-tickets', authenticateToken, supportController.getTickets);

module.exports = router;
