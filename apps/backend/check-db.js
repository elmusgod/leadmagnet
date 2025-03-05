const fs = require('fs');
const path = require('path');

// Check if better-sqlite3 is installed
try {
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
  
  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables in database:', tables.map(t => t.name));
  
  // Check if lead table exists
  if (tables.some(t => t.name === 'lead')) {
    // Get lead table schema
    const leadColumns = db.prepare("PRAGMA table_info(lead)").all();
    console.log('Lead table columns:', leadColumns.map(c => c.name));
    
    // Check if property_info column exists
    const hasPropertyInfo = leadColumns.some(c => c.name === 'property_info');
    console.log('Has property_info column:', hasPropertyInfo);
    
    if (!hasPropertyInfo) {
      console.log('The property_info column is missing from the lead table.');
      
      // Create a new lead table with the correct schema
      console.log('Creating a new lead table with the correct schema...');
      
      try {
        // Start a transaction
        db.exec('BEGIN TRANSACTION;');
        
        // Rename the current lead table
        db.exec('ALTER TABLE lead RENAME TO lead_old;');
        
        // Create a new lead table with the correct schema
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
        
        // Copy data from the old table to the new one
        const oldLeads = db.prepare('SELECT * FROM lead_old').all();
        console.log(`Found ${oldLeads.length} leads to migrate`);
        
        const insertStmt = db.prepare(`
          INSERT INTO lead (id, phone_number, property_info, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        for (const lead of oldLeads) {
          // Combine relevant fields into property_info
          const propertyInfo = [
            lead.type ? `Type: ${lead.type}` : null,
            lead.surface ? `Surface: ${lead.surface}m²` : null,
            lead.price ? `Prix: ${lead.price}€` : null,
            lead.city ? `Ville: ${lead.city}` : null,
            lead.description ? `Description: ${lead.description}` : null
          ].filter(Boolean).join(' - ') || 'Aucune information';
          
          // Map statut to status if needed
          const status = lead.status || lead.statut || 'new';
          
          insertStmt.run(
            lead.id,
            lead.phone_number || '',
            propertyInfo,
            status,
            lead.created_at || new Date().toISOString(),
            lead.updated_at || new Date().toISOString()
          );
        }
        
        // Drop the old table
        db.exec('DROP TABLE lead_old;');
        
        // Commit the transaction
        db.exec('COMMIT;');
        
        console.log('Lead table updated successfully');
        
        // Verify the new schema
        const newLeadColumns = db.prepare("PRAGMA table_info(lead)").all();
        console.log('New lead table columns:', newLeadColumns.map(c => c.name));
      } catch (error) {
        // Rollback the transaction on error
        db.exec('ROLLBACK;');
        console.error('Error updating lead table:', error.message);
      }
    }
  } else {
    console.log('Lead table does not exist');
  }
  
  // Close the database
  db.close();
} catch (error) {
  console.error('Error:', error.message);
}
