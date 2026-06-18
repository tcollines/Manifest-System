import { supabase } from '../supabase';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  console.log("=== CHECKING USER BY OLD AND NEW ID ===");

  // 1. Fetch user by old ID
  const { data: oldUser, error: oldErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', '1abd0f93-edea-4f01-9c1c-c76eb55905fa');
  console.log("User with old ID '1abd0f93-edea-4f01-9c1c-c76eb55905fa':", JSON.stringify(oldUser, null, 2));

  // 2. Fetch user by new ID
  const { data: newUser, error: newErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', '11324002-c401-494b-be68-179650967970');
  console.log("User with new ID '11324002-c401-494b-be68-179650967970':", JSON.stringify(newUser, null, 2));

  // 3. Let's see if we can find any users with username = 'Jose' or 'jose'
  const { data: joseUsers, error: joseErr } = await supabase
    .from('users')
    .select('*')
    .ilike('username', 'jose');
  console.log("Users with username 'jose':", JSON.stringify(joseUsers, null, 2));

  // 4. Let's read migration_log.txt and print lines related to Lukodda Joseph
  try {
    const logPath = path.join(__dirname, '../../migration_log.txt');
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf16le');
      console.log("=== migration_log.txt lines containing 'Lukodda': ===");
      content.split('\n').forEach((line, idx) => {
        if (line.includes('Lukodda')) {
          console.log(`${idx + 1}: ${line.trim()}`);
        }
      });
    } else {
      console.log("migration_log.txt not found.");
    }
  } catch (err: any) {
    console.error("Error reading migration log:", err.message);
  }
}

run().catch(console.error);
