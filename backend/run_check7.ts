import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: reqs, error } = await supabase
    .from('requisitions')
    .select(`*, requisition_items (*), workplan_items (dept_contribution)`)
    .eq('id', 'cf80c34f-3a47-4b5d-b6b5-f68d75e3a349');

  console.log(error || JSON.stringify(reqs, null, 2));
}
check();
