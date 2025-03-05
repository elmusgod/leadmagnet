const { Kysely, SqliteDialect } = require('kysely');
const Database = require('better-sqlite3');
const { FileMigrationProvider, Migrator } = require('kysely');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
  console.log('Starting migrations...');
  
  const db = new Kysely({
    dialect: new SqliteDialect({
      database: new Database('.sqlite_db')
    })
  });

  console.log('Database connected');
  
  // Check if lead table exists
  try {
    const result = await db.selectFrom('sqlite_master')
      .select(['name', 'sql'])
      .where('type', '=', 'table')
      .where('name', '=', 'lead')
      .executeTakeFirst();
    
    console.log('Lead table exists:', !!result);
    if (result) {
      console.log('Lead table schema:', result.sql);
    }
  } catch (error) {
    console.error('Error checking lead table:', error);
  }

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'src', 'migrations')
    })
  });

  console.log('Running migrations from:', path.join(__dirname, 'src', 'migrations'));
  
  const { error, results } = await migrator.migrateToLatest();
  
  if (results) {
    results.forEach(it => {
      console.log(`Migration '${it.migrationName}' ${it.status}`);
    });
  }
  
  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('Migrations completed successfully');
    
    // Check if lead table exists after migration
    try {
      const result = await db.selectFrom('sqlite_master')
        .select(['name', 'sql'])
        .where('type', '=', 'table')
        .where('name', '=', 'lead')
        .executeTakeFirst();
      
      console.log('Lead table exists after migration:', !!result);
      if (result) {
        console.log('Updated lead table schema:', result.sql);
      }
    } catch (error) {
      console.error('Error checking lead table after migration:', error);
    }
  }
  
  await db.destroy();
}

runMigrations().catch(console.error);
