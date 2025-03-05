const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Path to the SQLite database
const dbPath = path.join(__dirname, '.sqlite_db');

console.log(`Database path: ${dbPath}`);

// Check if the database file exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at: ${dbPath}`);
  process.exit(1);
}

// Connect to the database
const db = new Database(dbPath);

try {
  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables in database:', tables.map(t => t.name));
  
  // Check lead table schema
  const leadColumns = db.prepare("PRAGMA table_info(lead)").all();
  console.log('Lead table columns:', leadColumns.map(c => c.name));
  
  // Try to insert a test lead
  console.log('Inserting test lead...');
  
  const insertStmt = db.prepare(`
    INSERT INTO lead (phone_number, property_info, status)
    VALUES (?, ?, ?)
  `);
  
  const result = insertStmt.run(
    '0123456789',
    'Test property info',
    'new'
  );
  
  console.log('Insert result:', result);
  console.log('Last inserted ID:', result.lastInsertRowid);
  
  // Verify the inserted lead
  const lead = db.prepare('SELECT * FROM lead WHERE id = ?').get(result.lastInsertRowid);
  console.log('Inserted lead:', lead);
  
  // Clean up the test lead
  console.log('Cleaning up test lead...');
  db.prepare('DELETE FROM lead WHERE id = ?').run(result.lastInsertRowid);
  
  console.log('Test completed successfully');
} catch (error) {
  console.error('Error:', error.message);
} finally {
  // Close the database
  db.close();
}
