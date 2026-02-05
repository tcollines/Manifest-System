
import { supabase } from './src/supabase';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkCoordinators() {
    const { data, error } = await supabase
        .from('users')
        .select('name, role, event_id, department_id')
        .eq('role', 'Coordinator');

    if (error) {
        console.error('Error fetching coordinators:', error.message);
        return;
    }

    console.log('--- Current Coordinators ---');
    data.forEach(u => {
        console.log(`Name: ${u.name}, EventID: ${u.event_id}, DeptID: ${u.department_id}`);
    });
}

checkCoordinators();
