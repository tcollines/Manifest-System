import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicateEmails() {
  const targetEmail = 'ctumwiine004@gmail.com';
  console.log(`Checking for duplicates for: ${targetEmail}`);
  
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, status, manifest_id')
    .eq('email', targetEmail);
    
  if (error) {
    console.error("Query Error:", error.message);
    return;
  }
  
  console.log(`Found ${data.length} records:`);
  console.table(data);
}

checkDuplicateEmails();
