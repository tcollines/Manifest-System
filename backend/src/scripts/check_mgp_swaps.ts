import { supabase } from '../supabase';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  let output = "=== CHECKING FOR SWAPPED IDENTITIES ===\n\n";

  // 1. Fetch all GoTrue users
  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (authErr) {
    fs.writeFileSync(path.join(__dirname, 'swaps_output.txt'), "Error listing GoTrue users: " + authErr.message);
    return;
  }

  // 2. Fetch all public users
  const { data: dbUsers, error: dbErr } = await supabase
    .from('users')
    .select('id, name, email, username, role, status, event_id, department_id');

  if (dbErr) {
    fs.writeFileSync(path.join(__dirname, 'swaps_output.txt'), "Error fetching db users: " + dbErr.message);
    return;
  }

  const dbUserMap = new Map(dbUsers.map(u => [u.id, u]));

  output += "--- Mismatches between Auth Email and DB Profile ---\n";
  for (const authUser of authUsers) {
    const dbUser = dbUserMap.get(authUser.id);
    if (!dbUser) {
      output += `[ORPHAN AUTH] Auth ID: ${authUser.id} | Email: ${authUser.email}\n`;
      continue;
    }

    if (authUser.email?.toLowerCase() !== dbUser.email?.toLowerCase()) {
      output += `[EMAIL MISMATCH] ID: ${authUser.id} | Auth Email: ${authUser.email} | DB Email: ${dbUser.email} (Name: ${dbUser.name})\n`;
    }
  }

  output += "\n--- Mismatches between DB Email and Auth ---\n";
  const authUserMap = new Map(authUsers.map(u => [u.id, u]));
  for (const dbUser of dbUsers) {
    const authUser = authUserMap.get(dbUser.id);
    if (!authUser && dbUser.status !== 'Deleted' && dbUser.status !== 'Inactive') {
      output += `[MISSING AUTH] Active DB User: ${dbUser.name} (${dbUser.id}) | Email: ${dbUser.email} | Role: ${dbUser.role}\n`;
    }
  }

  output += "\n--- Lukodda Joseph specific DB entries ---\n";
  const lukoddas = dbUsers.filter(u => u.name.toLowerCase().includes('lukodda'));
  output += JSON.stringify(lukoddas, null, 2) + "\n";

  output += "\n--- Temp User 'stage' DB entries ---\n";
  const stages = dbUsers.filter(u => u.username === 'stage' || u.email?.startsWith('stage'));
  output += JSON.stringify(stages, null, 2) + "\n";

  fs.writeFileSync(path.join(__dirname, 'swaps_output.txt'), output);
}

run().catch(err => {
  fs.writeFileSync(path.join(__dirname, 'swaps_output.txt'), "Error: " + err.message);
});
