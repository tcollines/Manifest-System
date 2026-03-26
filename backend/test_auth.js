const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(envConfig.SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const input = 'aine';
  let { data, error } = await supabase
      .from('users')
      .select('id, email, password, role, username')
      .or(`username.eq."${input}",email.eq."${input}"`);
  console.log('With quotes syntax:', data, error?.message);

  let { data: d2, error: e2 } = await supabase
      .from('users')
      .select('id, email, password, role, username')
      .or(`username.eq.${input},email.eq.${input}`);
  console.log('Without quotes syntax:', d2, e2?.message);

  let { data: d3 } = await supabase.from('users').select('id, email, password, role, username').ilike('username', '%aine%');
  console.log('ilike aine:', d3);
  
  process.exit(0);
})();
