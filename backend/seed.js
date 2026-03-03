const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const args = process.argv.slice(2);
let username = null;
let password = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--username' && args[i + 1]) {
    username = args[i + 1];
    i++;
  } else if (args[i] === '--password' && args[i + 1]) {
    password = args[i + 1];
    i++;
  }
}

if (!username || !password) {
  console.error('Usage: node seed.js --username <username> --password <password>');
  process.exit(1);
}

const dbPath = process.env.DB_PATH || './database.db';
const db = new Database(path.resolve(__dirname, dbPath));
db.pragma('foreign_keys = ON');

const passwordHash = bcrypt.hashSync(password, 10);

try {
  const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
  stmt.run(username, passwordHash);
  console.log(`User "${username}" created successfully.`);
} catch (err) {
  if (err.message.includes('UNIQUE constraint')) {
    console.error(`User "${username}" already exists.`);
  } else {
    console.error('Error creating user:', err.message);
  }
  process.exit(1);
}

db.close();
