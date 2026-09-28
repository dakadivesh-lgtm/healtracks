const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateSignup, validateLogin } = require('../middleware/validation');

// Public routes
router.post('/register', validateSignup, authController.register);
router.post('/login', validateLogin, authController.login);

// Protected routes
router.get('/me', authenticateToken, authController.getMe);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
