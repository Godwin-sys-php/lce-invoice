const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './database.db';
const db = new Database(path.resolve(__dirname, '..', dbPath));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
