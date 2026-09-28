const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const db = require('./models/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const woundRoutes = require('./routes/woundRoutes');
const recordRoutes = require('./routes/recordRoutes');
const supportRoutes = require('./routes/supportRoutes');
const helpRoutes = require('./routes/helpRoutes');
const userRoutes = require('./routes/userRoutes');

// User model for seed
const userModel = require('./models/userModel');
const bcrypt = require('bcryptjs');

const app = express();

// Middlewares
app.use(cors({
  origin: true, // Allow dev clients or specified origin
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Database & Seed Initialization Promise
let initPromise = null;

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await db.initDatabase();
      await seedDefaultUser();
    })();
  }
  return initPromise;
}

// Middleware to ensure initialization completes before routes process
app.use(async (req, res, next) => {
  try {
    await ensureInitialized();
    next();
  } catch (err) {
    next(err);
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WoundWise API',
    database: db.isPostgres() ? 'PostgreSQL' : 'Local Fallback Store',
    aiEnabled: config.ai.isEnabled
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wounds', woundRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/user', userRoutes);

// 404 Route handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found.`
  });
});

// Global Error Handler
app.use(errorHandler);

// Seed initial default patient if no users exist
async function seedDefaultUser() {
  try {
    const existing = await userModel.findByEmail('divesh@woundwise.local');
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('woundwise123', salt);
      await userModel.createUser({
        name: 'Divesh Reddy',
        email: 'divesh@woundwise.local',
        passwordHash,
        role: 'Patient',
        phone: '+1 (555) 382-9012'
      });
      console.log('🌱 Seeded default demo account: divesh@woundwise.local / woundwise123');
    }
  } catch (err) {
    console.warn('Seed notice:', err.message);
  }
}

// Start Server if running directly
async function startServer() {
  try {
    await ensureInitialized();

    if (!process.env.VERCEL) {
      app.listen(config.port, () => {
        console.log(`🚀 WoundWise Backend running on port ${config.port}`);
        console.log(`📡 Health check: http://localhost:${config.port}/api/health`);
      });
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    if (!process.env.VERCEL) process.exit(1);
  }
}

startServer();

module.exports = app;
