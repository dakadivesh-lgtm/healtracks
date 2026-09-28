const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'woundwise-clinical-jwt-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Database Configuration
  db: {
    connectionString: process.env.DATABASE_URL || null,
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'woundwise_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  },

  // AI Assessment Configuration (Safe default: not configured unless explicit key provided)
  ai: {
    apiKey: process.env.AI_API_KEY || null,
    modelName: process.env.AI_MODEL || 'gemini-1.5-flash',
    isEnabled: Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY.trim().length > 5)
  },

  // File Uploads
  uploads: {
    directory: process.env.VERCEL ? '/tmp' : path.resolve(__dirname, '../../uploads'),
    maxFileSize: 15 * 1024 * 1024, // 15MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },

  // Client URL for CORS
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};
