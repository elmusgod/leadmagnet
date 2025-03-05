const Database = require('better-sqlite3');

function updateSchema() {
  console.log('Connecting to database...');
  const db = new Database('.sqlite_db');
  
  try {
    // Check current schema
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name));
    
    if (tables.some(t => t.name === 'lead')) {
      const leadTableInfo = db.prepare("PRAGMA table_info(lead)").all();
      console.log('Lead table columns:', leadTableInfo.map(c => c.name));
      
      // Check if we need to update the schema
      if (!leadTableInfo.some(c => c.name === 'property_info')) {
        console.log('Updating lead table schema...');
        
        // Create a new table with the desired schema
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
        
        // Copy data from the old table to the new one
        db.prepare(`
          INSERT INTO lead_new (id, phone_number, status, created_at, updated_at)
          SELECT id, 
                 COALESCE(phone_number, ''), 
                 COALESCE(statut, 'new'),
                 created_at,
                 updated_at
          FROM lead
        `).run();
        
        // Update property_info with combined data
        const leads = db.prepare('SELECT * FROM lead').all();
        const updateStmt = db.prepare('UPDATE lead_new SET property_info = ? WHERE id = ?');
        
        for (const lead of leads) {
          const propertyInfo = [
            lead.type ? `Type: ${lead.type}` : null,
            lead.surface ? `Surface: ${lead.surface}m²` : null,
            lead.price ? `Prix: ${lead.price}€` : null,
            lead.city ? `Ville: ${lead.city}` : null,
            lead.description ? `Description: ${lead.description}` : null
          ].filter(Boolean).join(' - ') || 'Aucune information';
          
          updateStmt.run(propertyInfo, lead.id);
        }
        
        // Drop the old table and rename the new one
        db.prepare('DROP TABLE lead').run();
        db.prepare('ALTER TABLE lead_new RENAME TO lead').run();
        
        console.log('Schema updated successfully');
        
        // Verify the new schema
        const newLeadTableInfo = db.prepare("PRAGMA table_info(lead)").all();
        console.log('New lead table columns:', newLeadTableInfo.map(c => c.name));
      } else {
        console.log('Schema is already up to date');
      }
    } else {
      console.log('Lead table does not exist');
    }
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    db.close();
  }
}

updateSchema();
