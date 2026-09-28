const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

let pool = null;
let usePostgres = false;
let localStore = null;
const localDbPath = process.env.VERCEL
  ? '/tmp/local_store.json'
  : path.resolve(__dirname, '../../database/local_store.json');

// Initialize local fallback store
function initLocalStore() {
  try {
    if (fs.existsSync(localDbPath)) {
      const data = fs.readFileSync(localDbPath, 'utf8');
      localStore = JSON.parse(data);
    } else {
      localStore = {
        users: [],
        wounds: [],
        wound_entries: [],
        assessments: [],
        support_tickets: [],
        user_preferences: []
      };
      saveLocalStore();
    }
  } catch (err) {
    console.error('Error initializing local store:', err);
    localStore = {
      users: [],
      wounds: [],
      wound_entries: [],
      assessments: [],
      support_tickets: [],
      user_preferences: []
    };
  }
}

function saveLocalStore() {
  try {
    fs.mkdirSync(path.dirname(localDbPath), { recursive: true });
    fs.writeFileSync(localDbPath, JSON.stringify(localStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save local store:', err);
  }
}

// Check PostgreSQL connection
async function initDatabase() {
  if (config.db.connectionString || process.env.PGHOST) {
    try {
      const poolConfig = config.db.connectionString
        ? { connectionString: config.db.connectionString, ssl: config.db.ssl }
        : {
            host: config.db.host,
            port: config.db.port,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
            ssl: config.db.ssl
          };

      pool = new Pool(poolConfig);
      // Test connection
      const client = await pool.connect();
      console.log('✅ Connected successfully to PostgreSQL database');
      client.release();
      usePostgres = true;
      return;
    } catch (err) {
      console.warn('⚠️ PostgreSQL connection failed:', err.message);
      console.warn('🔄 Falling back to persistent local storage engine for development');
      usePostgres = false;
    }
  } else {
    console.log('ℹ️ No PostgreSQL credentials configured. Using persistent local storage engine for development.');
    usePostgres = false;
  }

  initLocalStore();
}

/**
 * Universal query interface compatible with PostgreSQL parameterization ($1, $2, etc.)
 */
async function query(text, params = []) {
  if (usePostgres && pool) {
    return pool.query(text, params);
  }

  // Local engine fallback implementation
  if (!localStore) {
    initLocalStore();
  }

  const cleanQuery = text.trim();

  // Helper matching
  return executeLocalQuery(cleanQuery, params);
}

function executeLocalQuery(sql, params) {
  const lower = sql.toLowerCase();

  // 1. SELECT queries
  if (lower.startsWith('select')) {
    let tableName = null;
    const matchFrom = sql.match(/from\s+([a-zA-Z0-9_]+)/i);
    if (matchFrom) tableName = matchFrom[1].toLowerCase();

    if (!tableName || !localStore[tableName]) {
      // Could be dual select or join
      if (lower.includes('join')) {
        return handleLocalJoin(sql, params);
      }
      return { rows: [], rowCount: 0 };
    }

    let rows = [...localStore[tableName]];

    // Simple WHERE filtering
    if (lower.includes('where')) {
      rows = filterRows(tableName, sql, params, rows);
    }

    // ORDER BY
    if (lower.includes('order by')) {
      const matchOrder = sql.match(/order\s+by\s+([a-zA-Z0-9_.]+)(?:\s+(asc|desc))?/i);
      if (matchOrder) {
        const col = matchOrder[1].split('.').pop();
        const desc = matchOrder[2] && matchOrder[2].toLowerCase() === 'desc';
        rows.sort((a, b) => {
          const valA = a[col] || '';
          const valB = b[col] || '';
          if (valA < valB) return desc ? 1 : -1;
          if (valA > valB) return desc ? -1 : 1;
          return 0;
        });
      }
    }

    // LIMIT
    const matchLimit = sql.match(/limit\s+(\$?\d+)/i);
    if (matchLimit) {
      const limitVal = matchLimit[1].startsWith('$')
        ? params[parseInt(matchLimit[1].substring(1), 10) - 1]
        : parseInt(matchLimit[1], 10);
      rows = rows.slice(0, limitVal);
    }

    return { rows, rowCount: rows.length };
  }

  // 2. INSERT queries
  if (lower.startsWith('insert into')) {
    const matchInsert = sql.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
    if (matchInsert) {
      const tableName = matchInsert[1].toLowerCase();
      const columns = matchInsert[2].split(',').map(c => c.trim().toLowerCase());
      const valuesPlaceholders = matchInsert[3].split(',').map(v => v.trim());

      if (!localStore[tableName]) localStore[tableName] = [];

      const newRecord = {};
      columns.forEach((col, idx) => {
        const placeholder = valuesPlaceholders[idx];
        if (placeholder.startsWith('$')) {
          const paramIndex = parseInt(placeholder.substring(1), 10) - 1;
          newRecord[col] = params[paramIndex] !== undefined ? params[paramIndex] : null;
        } else if (placeholder.toLowerCase() === 'current_timestamp' || placeholder.toLowerCase() === 'now()') {
          newRecord[col] = new Date().toISOString();
        } else {
          newRecord[col] = placeholder.replace(/^['"]|['"]$/g, '');
        }
      });

      if (!newRecord.created_at) newRecord.created_at = new Date().toISOString();
      if (!newRecord.updated_at) newRecord.updated_at = new Date().toISOString();

      localStore[tableName].push(newRecord);
      saveLocalStore();

      return { rows: [newRecord], rowCount: 1 };
    }
  }

  // 3. UPDATE queries
  if (lower.startsWith('update')) {
    const matchUpdate = sql.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+(.*?)(?:\s+where\s+(.*))?$/is);
    if (matchUpdate) {
      const tableName = matchUpdate[1].toLowerCase();
      const setClause = matchUpdate[2];
      const whereClause = matchUpdate[3];

      if (!localStore[tableName]) return { rows: [], rowCount: 0 };

      // Parse SET statements robustly
      const setPairs = setClause.split(/,\s*(?=[a-zA-Z0-9_]+\s*=)/).map(s => s.trim());
      const updates = {};
      setPairs.forEach(pair => {
        const eqIdx = pair.indexOf('=');
        if (eqIdx !== -1) {
          const col = pair.substring(0, eqIdx).trim().toLowerCase();
          const val = pair.substring(eqIdx + 1).trim();
          if (val.startsWith('$')) {
            const paramIdx = parseInt(val.substring(1), 10) - 1;
            updates[col] = params[paramIdx];
          } else if (val.toLowerCase() === 'current_timestamp' || val.toLowerCase() === 'now()') {
            updates[col] = new Date().toISOString();
          } else {
            updates[col] = val.replace(/^['"]|['"]$/g, '');
          }
        }
      });

      let updatedCount = 0;
      const updatedRows = [];

      localStore[tableName] = localStore[tableName].map(row => {
        let match = true;
        if (whereClause) {
          const conditions = whereClause.split(/\s+and\s+/i);
          match = conditions.every(cond => {
            const m = cond.match(/([a-zA-Z0-9_.]+)\s*=\s*\$(\d+)/i);
            if (m) {
              const col = m[1].split('.').pop().toLowerCase();
              const targetVal = params[parseInt(m[2], 10) - 1];
              return String(row[col]) === String(targetVal);
            }
            return true;
          });
        }

        if (match) {
          updatedCount++;
          const updated = { ...row, ...updates, updated_at: new Date().toISOString() };
          updatedRows.push(updated);
          return updated;
        }
        return row;
      });

      saveLocalStore();
      return { rows: updatedRows, rowCount: updatedCount };
    }
  }

  // 4. DELETE queries
  if (lower.startsWith('delete from')) {
    const matchDelete = sql.match(/delete\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+(.*))?/is);
    if (matchDelete) {
      const tableName = matchDelete[1].toLowerCase();
      const whereClause = matchDelete[2];

      if (!localStore[tableName]) return { rows: [], rowCount: 0 };

      let deletedCount = 0;
      localStore[tableName] = localStore[tableName].filter(row => {
        let match = true;
        if (whereClause) {
          const conditions = whereClause.split(/\s+and\s+/i);
          match = conditions.every(cond => {
            const m = cond.match(/([a-zA-Z0-9_.]+)\s*=\s*\$(\d+)/i);
            if (m) {
              const col = m[1].split('.').pop().toLowerCase();
              const targetVal = params[parseInt(m[2], 10) - 1];
              return String(row[col]) === String(targetVal);
            }
            return true;
          });
        }
        if (match) deletedCount++;
        return !match;
      });

      // Cascade deletion for local JSON engine mode
      if (tableName === 'wounds' && deletedCount > 0 && params[0]) {
        const deletedWoundId = params[0];
        if (localStore.wound_entries) {
          const deletedEntryIds = localStore.wound_entries
            .filter(e => e.wound_id === deletedWoundId)
            .map(e => e.id);
          localStore.wound_entries = localStore.wound_entries.filter(e => e.wound_id !== deletedWoundId);
          if (localStore.assessments) {
            localStore.assessments = localStore.assessments.filter(a => !deletedEntryIds.includes(a.entry_id) && a.wound_id !== deletedWoundId);
          }
        }
      }

      saveLocalStore();
      return { rows: [], rowCount: deletedCount };
    }
  }

  return { rows: [], rowCount: 0 };
}

function filterRows(tableName, sql, params, rows) {
  // Extract simple where clauses: col = $1 AND col2 = $2
  const matchWhere = sql.match(/where\s+(.*?)(?:\s+order\s+by|\s+limit|$)/is);
  if (!matchWhere) return rows;

  const whereStr = matchWhere[1];
  const conditions = whereStr.split(/\s+and\s+/i);

  return rows.filter(row => {
    return conditions.every(cond => {
      const eqMatch = cond.match(/([a-zA-Z0-9_.]+)\s*=\s*\$(\d+)/i);
      if (eqMatch) {
        const col = eqMatch[1].split('.').pop().toLowerCase();
        const paramIdx = parseInt(eqMatch[2], 10) - 1;
        const targetVal = params[paramIdx];
        return String(row[col]) === String(targetVal);
      }
      return true;
    });
  });
}

function handleLocalJoin(sql, params) {
  const lower = sql.toLowerCase();
  if (lower.includes('wound_entries')) {
    const entries = localStore.wound_entries || [];
    const assessments = localStore.assessments || [];
    const wounds = localStore.wounds || [];

    let combined = entries.map(entry => {
      const assess = assessments.find(a => a.entry_id === entry.id) || null;
      const wound = wounds.find(w => w.id === entry.wound_id) || null;
      return {
        ...entry,
        wound_title: wound ? wound.title : '',
        wound_location: wound ? wound.location : '',
        wound_status: wound ? wound.status : 'Active',
        assessment_status: assess ? assess.status : 'not_configured',
        assessment_summary: assess ? assess.summary : 'Analysis not configured',
        assessment_details: assess ? assess.details : null
      };
    });

    if (lower.includes('where')) {
      const matchWhere = sql.match(/where\s+(.*?)(?:\s+order\s+by|\s+limit|$)/i);
      if (matchWhere) {
        const conditions = matchWhere[1].split(/\s+and\s+/i);
        combined = combined.filter(row => {
          return conditions.every(cond => {
            const m = cond.match(/([a-zA-Z0-9_.]+)\s*=\s*\$(\d+)/i);
            if (m) {
              const col = m[1].split('.').pop().toLowerCase();
              const targetVal = params[parseInt(m[2], 10) - 1];
              return String(row[col]) === String(targetVal);
            }
            return true;
          });
        });
      }
    }

    // Sort order
    if (lower.includes('order by')) {
      const matchOrder = sql.match(/order\s+by\s+([a-zA-Z0-9_.]+)(?:\s+(asc|desc))?/i);
      if (matchOrder) {
        const col = matchOrder[1].split('.').pop().toLowerCase();
        const desc = matchOrder[2] && matchOrder[2].toLowerCase() === 'desc';
        combined.sort((a, b) => {
          const valA = a[col] || '';
          const valB = b[col] || '';
          if (valA < valB) return desc ? 1 : -1;
          if (valA > valB) return desc ? -1 : 1;
          return 0;
        });
      }
    }

    const matchLimit = sql.match(/limit\s+(\$?\d+)/i);
    if (matchLimit) {
      const limitVal = matchLimit[1].startsWith('$')
        ? params[parseInt(matchLimit[1].substring(1), 10) - 1]
        : parseInt(matchLimit[1], 10);
      combined = combined.slice(0, limitVal);
    }

    return { rows: combined, rowCount: combined.length };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  initDatabase,
  query,
  getPool: () => pool,
  isPostgres: () => usePostgres
};
