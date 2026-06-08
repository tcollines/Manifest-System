import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: reqs, error } = await supabase.from('requisitions').select('*').eq('type', 'ADHOC').eq('status', 'PENDING');
  console.log(error || JSON.stringify(reqs, null, 2));
}
check();
