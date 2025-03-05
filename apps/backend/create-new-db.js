const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to the SQLite database
const dbPath = path.join(__dirname, '.sqlite_db');
const backupPath = path.join(__dirname, '.sqlite_db.bak');
const newDbPath = path.join(__dirname, '.sqlite_db.new');

console.log(`Database path: ${dbPath}`);

// Backup the current database
if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log(`Backed up database to: ${backupPath}`);
}

// Create a temporary SQL file for the new database
const sqlFilePath = path.join(__dirname, 'create-schema.sql');

// SQL commands to create the new schema
const sqlCommands = `
-- Create the agent table
CREATE TABLE agent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL
);

-- Create the lead table with the correct schema
CREATE TABLE lead (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  property_info TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create the call_log table
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

-- Create the system_config table
CREATE TABLE system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample data
INSERT INTO agent (name, prompt) VALUES ('Agent 1', 'Default prompt for Agent 1');
`;

// Write the SQL commands to a file
fs.writeFileSync(sqlFilePath, sqlCommands);
console.log(`SQL commands written to: ${sqlFilePath}`);

try {
  // Create a new database with the correct schema
  console.log('Creating new database...');
  execSync(`sqlite3 "${newDbPath}" < "${sqlFilePath}"`, { stdio: 'inherit' });
  
  // Replace the old database with the new one
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  fs.copyFileSync(newDbPath, dbPath);
  fs.unlinkSync(newDbPath);
  
  console.log('Database schema created successfully');
} catch (error) {
  console.error('Error creating database:', error.message);
} finally {
  // Clean up the temporary SQL file
  fs.unlinkSync(sqlFilePath);
  console.log('Temporary SQL file removed');
}
