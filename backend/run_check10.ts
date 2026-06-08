import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: dept } = await supabase.from('departments').select('*').ilike('name', 'Finance').single();
  console.log('Finance dept:', dept);
  if (dept) {
    const { data: users } = await supabase.from('users').select('*').eq('department_id', dept.id);
    console.log('Finance users:', users?.map(u => ({ name: u.name, role: u.role })));
  }
}
check();
