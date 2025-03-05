const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Create a new workbook
const wb = XLSX.utils.book_new();

// Sample data with phone numbers and property info
const data = [
  ['Numéro de téléphone', 'Informations sur le bien'],
  ['0601020304', 'Appartement T3 - 75m² - Paris 15ème - 450 000€'],
  ['0607080910', 'Maison 4 pièces - 120m² - Jardin 500m² - Garage - 320 000€'],
  ['0611121314', 'Terrain constructible - 800m² - Proche commodités - 95 000€'],
  ['0615161718', 'Studio - 30m² - Centre ville - Idéal investissement - 120 000€'],
  ['0619202122', 'Maison de village - 150m² - 5 chambres - À rénover - 180 000€']
];

// Create a worksheet
const ws = XLSX.utils.aoa_to_sheet(data);

// Add the worksheet to the workbook
XLSX.utils.book_append_sheet(wb, ws, 'Leads');

// Write the workbook to a file
const filePath = path.join(__dirname, 'test-leads.xlsx');
XLSX.writeFile(wb, filePath);

console.log(`Test Excel file created at: ${filePath}`);
