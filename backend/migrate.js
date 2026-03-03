const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./src/db');

async function migrate() {
  try {
    const migrationFile = path.join(__dirname, 'migrations', '001_initial.sql');
    const sql = fs.readFileSync(migrationFile, 'utf-8');

    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.execute(statement);
      }
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
