import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: depts } = await supabase.from('departments').select('*');
  const { data: wps, error } = await supabase.from('monthly_workplans').select('*, workplan_items(id, activity, status)');
  console.log(error || JSON.stringify(wps?.map(w => ({
    dept: depts?.find(d => d.id === w.department_id)?.name,
    status: w.status,
    items: w.workplan_items?.map(i => i.status)
  })), null, 2));
}
check();
