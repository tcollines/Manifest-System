import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const mappingPath = path.join(__dirname, '../../migration_mapping.json');
  if (!fs.existsSync(mappingPath)) {
    fs.writeFileSync(path.join(__dirname, 'mapping_output.txt'), "migration_mapping.json not found.");
    return;
  }

  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  let output = `Type of mapping: ${Array.isArray(mapping) ? 'Array' : typeof mapping}\n`;
  if (Array.isArray(mapping)) {
    output += `Length: ${mapping.length}\n`;
    output += `Sample: ${JSON.stringify(mapping.slice(0, 3), null, 2)}\n`;
    
    // Search for station ID or user ID in the array
    const stationMatch = mapping.find((item: any) => 
      JSON.stringify(item).includes('s-1770145860115') ||
      JSON.stringify(item).includes('1abd0f93-edea-4f01-9c1c-c76eb55905fa')
    );
    output += `Search match: ${JSON.stringify(stationMatch, null, 2)}\n`;

    // Let's search for "Lukodda" in the array
    const lukoddaMatch = mapping.filter((item: any) => 
      JSON.stringify(item).toLowerCase().includes('lukodda')
    );
    output += `Lukodda matches: ${JSON.stringify(lukoddaMatch, null, 2)}\n`;
  } else {
    output += `Keys: ${Object.keys(mapping).slice(0, 10).join(', ')}\n`;
  }

  fs.writeFileSync(path.join(__dirname, 'mapping_output.txt'), output);
}

run().catch(err => {
  fs.writeFileSync(path.join(__dirname, 'mapping_output.txt'), "Error: " + err.message);
});
