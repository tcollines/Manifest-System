
import { supabase } from '../src/supabase';

async function investigateD0() {
    console.log('--- Investigating "d0" in users.department_id ---');

    // Fetch everything to be safe
    const { data: users, error } = await supabase
        .from('users')
        .select('*');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    const d0User = users.find(u => u.department_id === 'd0' || String(u.department_id).includes('d0'));
    if (d0User) {
        console.log('Found user with potentially legacy department_id:');
        console.log(JSON.stringify(d0User, null, 2));
    } else {
        console.log('No user found with department_id matching "d0".');
        // Let's check all unique department_ids
        const uniqueDeptIds = [...new Set(users.map(u => u.department_id))];
        console.log('Unique Department IDs in users table:');
        console.log(uniqueDeptIds);
    }
}

investigateD0().catch(console.error);
