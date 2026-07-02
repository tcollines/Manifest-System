import { supabase } from '../supabase';

async function run() {
  const deptId = '4630e48a-f97e-48fd-a901-864b591c282f';
  const { data: users, error: usersErr } = await supabase.from('users')
    .select('id, name, role, department_id, department_uid, status')
    .eq('department_id', deptId);
  if (usersErr) console.error("Users Error:", usersErr);
  console.log("Transportation (d5) users by department_id:", users);

  const { data: users2, error: usersErr2 } = await supabase.from('users')
    .select('id, name, role, department_id, department_uid, status')
    .eq('department_uid', deptId);
  if (usersErr2) console.error("Users2 Error:", usersErr2);
  console.log("Transportation (d5) users by department_uid:", users2);
}

run().catch(console.error);
