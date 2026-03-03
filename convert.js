const fs = require('fs');
const content = fs.readFileSync('oldAuth.ts', 'utf16le');
fs.writeFileSync('oldAuth.utf8.ts', content, 'utf8');
console.log("Converted.");
