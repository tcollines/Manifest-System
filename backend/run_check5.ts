import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: batch, error } = await supabase.from('requisition_batches').select('*').eq('id', '76cfc398-fa5e-4b32-abbe-4efe9451a11f').single();
  console.log(error || JSON.stringify(batch, null, 2));
}
check();
