const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '.sqlite_db');
console.log(`Connecting to database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    return;
  }
  console.log('Connected to the database');
  
  // Run in sequence
  db.serialize(() => {
    // Check if lead table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='lead'", (err, row) => {
      if (err) {
        console.error('Error checking for lead table:', err.message);
        return;
      }
      
      if (row) {
        console.log('Lead table exists, checking schema...');
        
        // Get current schema
        db.all("PRAGMA table_info(lead)", (err, columns) => {
          if (err) {
            console.error('Error getting table info:', err.message);
            return;
          }
          
          console.log('Current lead table columns:', columns.map(c => c.name));
          
          // Check if property_info column exists
          const hasPropertyInfo = columns.some(c => c.name === 'property_info');
          
          if (!hasPropertyInfo) {
            console.log('property_info column missing, updating schema...');
            
            // Start transaction
            db.run('BEGIN TRANSACTION', (err) => {
              if (err) {
                console.error('Error starting transaction:', err.message);
                return;
              }
              
              // Drop existing temporary tables if they exist
              db.run('DROP TABLE IF EXISTS lead_backup', (err) => {
                if (err) {
                  console.error('Error dropping backup table:', err.message);
                  db.run('ROLLBACK');
                  return;
                }
                
                db.run('DROP TABLE IF EXISTS lead_new', (err) => {
                  if (err) {
                    console.error('Error dropping new table:', err.message);
                    db.run('ROLLBACK');
                    return;
                  }
                  
                  // Create backup
                  db.run('CREATE TABLE lead_backup AS SELECT * FROM lead', (err) => {
                    if (err) {
                      console.error('Error creating backup:', err.message);
                      db.run('ROLLBACK');
                      return;
                    }
                    
                    console.log('Backup created successfully');
                    
                    // Create new table
                    db.run(`
                      CREATE TABLE lead_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        phone_number TEXT NOT NULL,
                        property_info TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'new',
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                      )
                    `, (err) => {
                      if (err) {
                        console.error('Error creating new table:', err.message);
                        db.run('ROLLBACK');
                        return;
                      }
                      
                      console.log('New table created successfully');
                      
                      // Get all leads
                      db.all('SELECT * FROM lead', (err, leads) => {
                        if (err) {
                          console.error('Error getting leads:', err.message);
                          db.run('ROLLBACK');
                          return;
                        }
                        
                        console.log(`Found ${leads.length} leads to migrate`);
                        
                        // Prepare insert statement
                        const stmt = db.prepare(`
                          INSERT INTO lead_new (id, phone_number, property_info, status, created_at, updated_at)
                          VALUES (?, ?, ?, ?, ?, ?)
                        `);
                        
                        // Insert each lead
                        let migrated = 0;
                        
                        leads.forEach((lead) => {
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
                          
                          stmt.run(
                            lead.id,
                            lead.phone_number || '',
                            propertyInfo,
                            status,
                            lead.created_at || new Date().toISOString(),
                            lead.updated_at || new Date().toISOString(),
                            function(err) {
                              if (err) {
                                console.error(`Error inserting lead ${lead.id}:`, err.message);
                              } else {
                                migrated++;
                              }
                            }
                          );
                        });
                        
                        stmt.finalize();
                        
                        console.log(`Migrated ${migrated} leads`);
                        
                        // Drop old table
                        db.run('DROP TABLE lead', (err) => {
                          if (err) {
                            console.error('Error dropping old table:', err.message);
                            db.run('ROLLBACK');
                            return;
                          }
                          
                          // Rename new table
                          db.run('ALTER TABLE lead_new RENAME TO lead', (err) => {
                            if (err) {
                              console.error('Error renaming table:', err.message);
                              db.run('ROLLBACK');
                              return;
                            }
                            
                            // Commit transaction
                            db.run('COMMIT', (err) => {
                              if (err) {
                                console.error('Error committing transaction:', err.message);
                                db.run('ROLLBACK');
                                return;
                              }
                              
                              console.log('Schema update completed successfully');
                              
                              // Verify new schema
                              db.all("PRAGMA table_info(lead)", (err, columns) => {
                                if (err) {
                                  console.error('Error getting updated table info:', err.message);
                                  return;
                                }
                                
                                console.log('New lead table columns:', columns.map(c => c.name));
                                
                                // Close database
                                db.close((err) => {
                                  if (err) {
                                    console.error('Error closing database:', err.message);
                                  } else {
                                    console.log('Database closed');
                                  }
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          } else {
            console.log('Schema is already correct, no changes needed');
            
            // Close database
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err.message);
              } else {
                console.log('Database closed');
              }
            });
          }
        });
      } else {
        console.log('Lead table does not exist, creating it...');
        
        // Create lead table
        db.run(`
          CREATE TABLE lead (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone_number TEXT NOT NULL,
            property_info TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating lead table:', err.message);
          } else {
            console.log('Lead table created successfully');
          }
          
          // Close database
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err.message);
            } else {
              console.log('Database closed');
            }
          });
        });
      }
    });
  });
});
