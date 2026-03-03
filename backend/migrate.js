const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './database.db';
const db = new Database(path.resolve(__dirname, dbPath));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrationFile = path.join(__dirname, 'migrations', '001_initial.sql');
const sql = fs.readFileSync(migrationFile, 'utf-8');

db.exec(sql);

console.log('Migration completed successfully.');
db.close();
