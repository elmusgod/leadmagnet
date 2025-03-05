const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Path to the SQLite database
const dbPath = path.join(__dirname, '.sqlite_db');
const backupPath = path.join(__dirname, '.sqlite_db.bak');

console.log(`Database path: ${dbPath}`);

// Backup the current database
if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log(`Backed up database to: ${backupPath}`);
}

try {
  // Delete the existing database
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Deleted existing database');
  }
  
  // Create a new database with the correct schema
  console.log('Creating new database...');
  const db = new Database(dbPath);
  
  // Create the agent table
  db.exec(`
    CREATE TABLE agent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL
    );
  `);
  console.log('Created agent table');
  
  // Create the lead table with the correct schema
  db.exec(`
    CREATE TABLE lead (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      property_info TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Created lead table');
  
  // Create the call_log table
  db.exec(`
    CREATE TABLE call_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      duration TEXT,
      agent INTEGER NOT NULL,
      records TEXT,
      call_sid TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Created call_log table');
  
  // Create the system_config table
  db.exec(`
    CREATE TABLE system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Created system_config table');
  
  // Insert some sample data
  db.exec(`
    INSERT INTO agent (name, prompt) VALUES ('Agent 1', 'Default prompt for Agent 1');
  `);
  console.log('Inserted sample data');
  
  // Verify the schema
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables in database:', tables.map(t => t.name));
  
  const leadColumns = db.prepare("PRAGMA table_info(lead)").all();
  console.log('Lead table columns:', leadColumns.map(c => c.name));
  
  // Close the database
  db.close();
  console.log('Database schema created successfully');
} catch (error) {
  console.error('Error creating database:', error.message);
  
  // Restore from backup if there was an error
  if (fs.existsSync(backupPath) && !fs.existsSync(dbPath)) {
    fs.copyFileSync(backupPath, dbPath);
    console.log('Restored database from backup');
  }
}
