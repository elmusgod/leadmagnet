const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const XLSX = require('xlsx');

// Path to the SQLite database
const dbPath = path.join(__dirname, '.sqlite_db');
console.log(`Database path: ${dbPath}`);

// Path to the test Excel file
const excelPath = path.join(__dirname, 'test-leads.xlsx');
console.log(`Excel file path: ${excelPath}`);

// Check if the database file exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at: ${dbPath}`);
  process.exit(1);
}

// Check if the Excel file exists
if (!fs.existsSync(excelPath)) {
  console.error(`Excel file not found at: ${excelPath}`);
  process.exit(1);
}

// Connect to the database
const db = new Database(dbPath);

try {
  // Read the Excel file
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(excelPath, { 
    type: 'file', 
    cellDates: true, 
    cellNF: false, 
    cellText: false 
  });
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel file has no sheets');
  }
  
  const sheetName = workbook.SheetNames[0];
  console.log(`Using sheet: ${sheetName}`);
  
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with array format (header: 1)
  console.log('Converting to JSON...');
  const data = XLSX.utils.sheet_to_json(worksheet, { 
    defval: null,
    raw: true,
    header: 1
  });
  
  console.log(`Found ${data ? data.length : 0} rows in Excel file`);
  
  if (!data || data.length === 0) {
    throw new Error('Excel file has no data rows');
  }
  
  // Map Excel data to lead objects
  console.log('Mapping Excel data to lead objects...');
  const leads = [];
  
  // Skip the header row if it exists
  const startIndex = data[0][0] && typeof data[0][0] === 'string' ? 1 : 0;
  
  for (let index = startIndex; index < data.length; index++) {
    try {
      const row = data[index];
      
      // Skip empty rows
      if (!row || row.length === 0) {
        console.log(`Skipping empty row at index ${index}`);
        continue;
      }
      
      // Get phone number from first column
      const phoneNumber = row[0] ? String(row[0]).trim() : '';
      
      // Get property info from second column
      const propertyInfo = row[1] ? String(row[1]).trim() : '';
      
      // Skip rows without phone number or property info
      if (!phoneNumber || !propertyInfo) {
        console.log(`Skipping row ${index} due to missing phone number or property info`);
        continue;
      }
      
      // Create a lead object
      const lead = {
        phone_number: phoneNumber,
        property_info: propertyInfo,
        status: 'new'
      };
      
      leads.push(lead);
    } catch (rowError) {
      console.error(`Error processing row ${index}:`, rowError);
      console.error('Row data:', JSON.stringify(data[index]));
      // Continue processing other rows
      console.log(`Skipping row ${index} due to error`);
    }
  }
  
  if (leads.length === 0) {
    throw new Error('No valid leads found in Excel file');
  }
  
  // Insert leads into database
  console.log(`Inserting ${leads.length} leads into database...`);
  
  // Start a transaction
  db.exec('BEGIN TRANSACTION;');
  
  const insertStmt = db.prepare(`
    INSERT INTO lead (phone_number, property_info, status)
    VALUES (?, ?, ?)
  `);
  
  let successCount = 0;
  
  for (let i = 0; i < leads.length; i++) {
    try {
      console.log(`Inserting lead ${i+1}/${leads.length}...`);
      console.log('Lead data:', JSON.stringify(leads[i]));
      
      const result = insertStmt.run(
        leads[i].phone_number,
        leads[i].property_info,
        leads[i].status
      );
      
      successCount++;
      console.log(`Lead ${i+1} inserted successfully, ID: ${result.lastInsertRowid}`);
    } catch (dbError) {
      console.error(`Error inserting lead ${i+1}:`, dbError.message);
      // Continue with other leads
    }
  }
  
  // Commit the transaction
  db.exec('COMMIT;');
  
  console.log(`Successfully imported ${successCount} leads out of ${leads.length}`);
  
  // Clean up the inserted leads
  console.log('Cleaning up test leads...');
  db.exec("DELETE FROM lead WHERE status = 'new';");
  
  console.log('Test completed successfully');
} catch (error) {
  console.error('Error:', error.message);
  
  // Rollback the transaction if an error occurred
  try {
    db.exec('ROLLBACK;');
  } catch (rollbackError) {
    console.error('Error rolling back transaction:', rollbackError.message);
  }
} finally {
  // Close the database
  db.close();
}
