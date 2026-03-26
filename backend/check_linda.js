const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function checkLinda() {
  const email = 'lindanabuuma2@gmail.com';

  console.log('Checking Auth Users for:', email);
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Auth Error:', authError.message);
  } else {
    const user = authUsers.users.find(u => u.email === email);
    console.log('Auth User:', user ? JSON.stringify(user, null, 2) : 'Not found');
  }

  console.log('Checking Auth User by UID:');
  const { data: userById, error: userError } = await supabase.auth.admin.getUserById('81b8b740-6663-4179-bcfb-e3dc7524d36c');
  if (userError) {
    console.error('UserById Error:', userError.message);
  } else {
    console.log('UserById:', userById ? JSON.stringify(userById, null, 2) : 'Not found');
  }

  console.log('\nChecking Members Table...');
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, name, email, role')
    .eq('email', email);
  if (membersError) console.error('Members Error:', membersError.message);
  else console.table(members);
}

checkLinda();
