import { supabase } from '../supabase';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  console.log("=== CHECKING EVENT ID 6ef635f1-d285-4188-baca-612c8a19e4db ===");

  // 1. Query live database
  const { data: event, error } = await supabase
    .from('ministry_events')
    .select('*')
    .eq('id', '6ef635f1-d285-4188-baca-612c8a19e4db')
    .maybeSingle();

  if (error) {
    console.error("DB Error:", error.message);
  } else if (event) {
    console.log("Found in DB:", JSON.stringify(event, null, 2));
  } else {
    console.log("Not found in live DB.");
  }

  // 2. Search in pre-phase-3b JSON backup
  const backupPath = path.join(__dirname, '../../manifest_pre_phase_3b_2026-02-10T14-15-33-844Z.json');
  if (fs.existsSync(backupPath)) {
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    // Let's search for the event in events list (if it has one)
    console.log("Searching in pre-phase 3b json backup...");
    // Let's traverse and find any object containing this ID
    const matches: any[] = [];
    function traverse(obj: any) {
      if (typeof obj === 'object' && obj !== null) {
        if (obj.id === '6ef635f1-d285-4188-baca-612c8a19e4db' || obj.event_id === '6ef635f1-d285-4188-baca-612c8a19e4db') {
          matches.push(obj);
        } else {
          for (const v of Object.values(obj)) {
            traverse(v);
          }
        }
      }
    }
    traverse(data);
    console.log("Matches in backup JSON:", JSON.stringify(matches.slice(0, 5), null, 2));
  } else {
    console.log("Backup JSON not found.");
  }

  // 3. Print lines containing 6ef635f1-d285-4188-baca-612c8a19e4db in audit_output.txt
  const auditPath = path.join(__dirname, '../../audit_output.txt');
  if (fs.existsSync(auditPath)) {
    const content = fs.readFileSync(auditPath, 'utf16le');
    console.log("=== Lines in audit_output.txt: ===");
    content.split('\n').forEach((line, idx) => {
      if (line.includes('6ef635f1-d285-4188-baca-612c8a19e4db')) {
        console.log(`${idx + 1}: ${line.trim()}`);
      }
    });
  }
}

run().catch(console.error);
