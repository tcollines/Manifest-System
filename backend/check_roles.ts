import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('users').select('role');
    if (error) {
        console.error("Error:", error);
        return;
    }

    const roles = data.map(u => u.role);
    const uniqueRoles = [...new Set(roles)];
    console.log("Unique roles currently in DB:", uniqueRoles);

    // Find violating roles
    const validRoles = ['Super Admin', 'Administrator', 'Coordinator', 'Resident Coordinator', 'Logistics', 'Member', 'TeamLeader'];
    const invalidRoles = uniqueRoles.filter(r => !validRoles.includes(r));
    console.log("Violating roles:", invalidRoles);
}

run();
