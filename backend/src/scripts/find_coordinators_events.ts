import * as fs from 'fs';
import * as path from 'path';

function searchDirectory(dir: string, results: string[]) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        searchDirectory(fullPath, results);
      }
    } else {
      if (file.endsWith('.json') || file.endsWith('.txt') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.sql') || file.endsWith('.log')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('Kiboneka Peter') || content.includes('Eric Mugerwa') || content.includes('Mukasa Joseph')) {
            results.push(fullPath);
          }
        } catch (e) {}
      }
    }
  }
}

async function run() {
  const results: string[] = [];
  searchDirectory('d:\\Manifest System', results);
  console.log("=== FILES CONTAINING CO-COORDINATORS ===");
  results.forEach(f => console.log(f));
}

run().catch(console.error);
