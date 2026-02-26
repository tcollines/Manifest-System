
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Find the latest file in the directory
const dir = 'C:\\Users\\Abraham\\Downloads\\Documents';
const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('First_Timers_Reconciled_2026') && f.endsWith('.xlsx'))
    .sort()
    .reverse();

if (files.length === 0) { console.log('No file found'); return; }

const latestFile = path.join(dir, files[0]);
console.log(`Checking file: ${latestFile}`);

const workbook = XLSX.readFile(latestFile);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Total Rows: ${data.length}`);
