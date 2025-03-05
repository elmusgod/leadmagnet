const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function fixDatabase() {
  console.log('Starting database fix...');
  
  // Connect to the database
  const dbPath = path.join(__dirname, '.sqlite_db');
  console.log(`Connecting to database at: ${dbPath}`);
  
  if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found at: ${dbPath}`);
    return;
  }
  
  const db = new Database(dbPath);
  
  try {
    // Enable foreign keys
    db.pragma('foreign_keys = OFF');
    
    // Start a transaction
    db.prepare('BEGIN TRANSACTION').run();
    
    // Check if lead table exists
    const leadTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='lead'").get();
    
    if (leadTableExists) {
      console.log('Lead table exists, checking schema...');
      
      // Get current schema
      const columns = db.prepare("PRAGMA table_info(lead)").all();
      console.log('Current lead table columns:', columns.map(c => c.name));
      
      // Check if property_info column exists
      const hasPropertyInfo = columns.some(c => c.name === 'property_info');
      
      if (!hasPropertyInfo) {
        console.log('property_info column missing, updating schema...');
        
        // Create a backup of the current table
        console.log('Creating backup of lead table...');
        try {
          db.prepare('DROP TABLE IF EXISTS lead_backup').run();
          db.prepare('CREATE TABLE lead_backup AS SELECT * FROM lead').run();
        } catch (error) {
          console.error('Error creating backup:', error);
          // Continue anyway
        }
        
        // Create new table with correct schema
        console.log('Creating new lead table with correct schema...');
        try {
          db.prepare('DROP TABLE IF EXISTS lead_new').run();
          db.prepare(`
            CREATE TABLE lead_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              phone_number TEXT NOT NULL,
              property_info TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'new',
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `).run();
        } catch (error) {
          console.error('Error creating new table:', error);
          throw error;
        }
        
        // Get all leads from the old table
        const leads = db.prepare('SELECT * FROM lead').all();
        console.log(`Found ${leads.length} leads to migrate`);
        
        // Insert statement for the new table
        const insertStmt = db.prepare(`
          INSERT INTO lead_new (id, phone_number, property_info, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        // Migrate data
        for (const lead of leads) {
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
          
          // Insert into new table
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
        console.log('Dropping old lead table...');
        db.prepare('DROP TABLE lead').run();
        
        // Rename the new table
        console.log('Renaming new table to lead...');
        db.prepare('ALTER TABLE lead_new RENAME TO lead').run();
        
        // Verify the new schema
        const newColumns = db.prepare("PRAGMA table_info(lead)").all();
        console.log('New lead table columns:', newColumns.map(c => c.name));
        
        console.log('Schema update completed successfully');
      } else {
        console.log('Schema is already correct, no changes needed');
      }
    } else {
      console.log('Lead table does not exist, creating it...');
      
      // Create lead table with correct schema
      db.prepare(`
        CREATE TABLE lead (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone_number TEXT NOT NULL,
          property_info TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'new',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      console.log('Lead table created successfully');
    }
    
    // Commit the transaction
    db.prepare('COMMIT').run();
    
    console.log('Database fix completed successfully');
  } catch (error) {
    // Rollback on error
    console.error('Error fixing database:', error);
    db.prepare('ROLLBACK').run();
  } finally {
    // Close the database connection
    db.close();
  }
}

fixDatabase();
