const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const bcrypt = require('bcryptjs');
const db = require('./src/db');

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

async function seed() {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    await db.execute(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );
    
    console.log(`User "${username}" created successfully.`);
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.error(`User "${username}" already exists.`);
    } else {
      console.error('Error creating user:', err.message);
    }
    process.exit(1);
  }
}

seed();
