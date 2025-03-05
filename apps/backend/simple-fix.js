const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to the SQLite database
const dbPath = path.join(__dirname, '.sqlite_db');
console.log(`Database path: ${dbPath}`);

// Check if the database file exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at: ${dbPath}`);
  process.exit(1);
}

// Create a temporary SQL file
const sqlFilePath = path.join(__dirname, 'fix-schema.sql');

// SQL commands to fix the schema
const sqlCommands = `
-- Turn off foreign key constraints
PRAGMA foreign_keys = OFF;

-- Start a transaction
BEGIN TRANSACTION;

-- Create a backup of the current lead table
DROP TABLE IF EXISTS lead_backup;
CREATE TABLE lead_backup AS SELECT * FROM lead;

-- Create a new table with the correct schema
DROP TABLE IF EXISTS lead_new;
CREATE TABLE lead_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  property_info TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert data from the old table to the new one
INSERT INTO lead_new (id, phone_number, property_info, status, created_at, updated_at)
SELECT 
  id, 
  COALESCE(phone_number, ''), 
  COALESCE(
    CASE 
      WHEN type IS NOT NULL OR surface IS NOT NULL OR price IS NOT NULL OR city IS NOT NULL OR description IS NOT NULL THEN
        COALESCE(type, '') || 
        CASE WHEN surface IS NOT NULL THEN ' - Surface: ' || surface || 'm²' ELSE '' END ||
        CASE WHEN price IS NOT NULL THEN ' - Prix: ' || price || '€' ELSE '' END ||
        CASE WHEN city IS NOT NULL THEN ' - Ville: ' || city ELSE '' END ||
        CASE WHEN description IS NOT NULL THEN ' - Description: ' || description ELSE '' END
      ELSE 'Aucune information'
    END,
    'Aucune information'
  ),
  COALESCE(statut, 'new'),
  COALESCE(created_at, CURRENT_TIMESTAMP),
  COALESCE(updated_at, CURRENT_TIMESTAMP)
FROM lead;

-- Drop the old table
DROP TABLE lead;

-- Rename the new table to the original name
ALTER TABLE lead_new RENAME TO lead;

-- Commit the transaction
COMMIT;

-- Turn on foreign key constraints
PRAGMA foreign_keys = ON;

-- Verify the new schema
PRAGMA table_info(lead);
`;

// Write the SQL commands to a file
fs.writeFileSync(sqlFilePath, sqlCommands);
console.log(`SQL commands written to: ${sqlFilePath}`);

try {
  // Execute the SQL commands using the sqlite3 command-line tool
  console.log('Executing SQL commands...');
  execSync(`sqlite3 "${dbPath}" < "${sqlFilePath}"`, { stdio: 'inherit' });
  console.log('Database schema updated successfully');
} catch (error) {
  console.error('Error executing SQL commands:', error.message);
} finally {
  // Clean up the temporary SQL file
  fs.unlinkSync(sqlFilePath);
  console.log('Temporary SQL file removed');
}
