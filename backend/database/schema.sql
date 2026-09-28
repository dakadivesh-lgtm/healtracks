-- WoundWise Database Schema (PostgreSQL)
-- File: backend/database/schema.sql

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Patient',
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Wounds Table (Parent wound track cases)
CREATE TABLE IF NOT EXISTS wounds (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Wound Entries Table (Individual photos and logs over time)
CREATE TABLE IF NOT EXISTS wound_entries (
    id VARCHAR(36) PRIMARY KEY,
    wound_id VARCHAR(36) NOT NULL REFERENCES wounds(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INTEGER,
    notes TEXT,
    is_followup BOOLEAN DEFAULT FALSE,
    followup_day INTEGER DEFAULT 1,
    pain_score INTEGER DEFAULT 0,
    swelling_level VARCHAR(30) DEFAULT 'None',
    redness_status VARCHAR(50) DEFAULT 'Normal',
    fever BOOLEAN DEFAULT FALSE,
    discharge BOOLEAN DEFAULT FALSE,
    bad_smell BOOLEAN DEFAULT FALSE,
    bleeding_uncontrolled BOOLEAN DEFAULT FALSE,
    diabetes BOOLEAN DEFAULT FALSE,
    foot_wound BOOLEAN DEFAULT FALSE,
    animal_bite BOOLEAN DEFAULT FALSE,
    snake_bite BOOLEAN DEFAULT FALSE,
    tetanus_concern BOOLEAN DEFAULT FALSE,
    worsening_pain BOOLEAN DEFAULT FALSE,
    wound_area_px DOUBLE PRECISION,
    wound_area_cm2 DOUBLE PRECISION,
    coverage_pct DOUBLE PRECISION,
    segmentation_data TEXT,
    symptom_data TEXT,
    comparison_data TEXT,
    triage_level VARCHAR(30) DEFAULT 'green',
    triage_reasons TEXT,
    quality_metrics TEXT, -- JSON string or JSONB
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
    id VARCHAR(36) PRIMARY KEY,
    entry_id VARCHAR(36) NOT NULL REFERENCES wound_entries(id) ON DELETE CASCADE,
    wound_id VARCHAR(36) NOT NULL REFERENCES wounds(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'not_configured',
    summary VARCHAR(255) DEFAULT 'Analysis not configured',
    details TEXT, -- JSON payload containing configuration notes / AI findings if configured
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'Normal',
    status VARCHAR(50) DEFAULT 'Open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    healing_reminders BOOLEAN DEFAULT TRUE,
    dark_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wounds_user_id ON wounds(user_id);
CREATE INDEX IF NOT EXISTS idx_wound_entries_wound_id ON wound_entries(wound_id);
CREATE INDEX IF NOT EXISTS idx_wound_entries_user_id ON wound_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_entry_id ON assessments(entry_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
