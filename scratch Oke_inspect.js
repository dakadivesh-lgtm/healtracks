const fs = require('fs');
const path = require('path');

const storePath = path.resolve(__dirname, '../backend/database/local_store.json');
const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

const targetEntry = store.wound_entries.find(e => e.id === '5af2c7c3-8332-459a-afbb-674649061697');
console.log('Target Entry full object:');
console.log(targetEntry);
