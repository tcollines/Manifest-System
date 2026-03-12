const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, 'backend', '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function checkNabulime() {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, phone, residency')
    .ilike('name', '%Nabulime Rosemary%');

  if (error) {
    console.error(error);
  } else {
    console.table(data);
  }
}

checkNabulime();
