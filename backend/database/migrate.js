const fs = require('fs');
const path = require('path');
const db = require('../src/models/db');

async function runMigration() {
  console.log('--- WoundWise Database Migration ---');
  await db.initDatabase();

  if (db.isPostgres()) {
    console.log('Applying PostgreSQL schema from schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    try {
      await db.query(schemaSql);
      console.log('✅ PostgreSQL schema successfully migrated!');
    } catch (err) {
      console.error('❌ Migration failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Local development database initialized successfully.');
  }

  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
