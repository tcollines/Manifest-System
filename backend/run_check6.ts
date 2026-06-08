import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: reqs, error } = await supabase
    .from('requisitions')
    .select(`*, requisition_items (*), workplan_items (dept_contribution)`)
    .eq('manifest_id', '593fbdbb-8211-44ca-b3e2-8d999c88680c')
    .eq('status', 'PENDING');

  console.log(error || JSON.stringify(reqs, null, 2));
}
check();
