require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');

async function checkEventIds() {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: dbUsers, error } = await sb.from('users')
        .select('name, role, event_id, department_id, station_id')
        .in('role', ['Vehicle Coordinator', 'Stage Coordinator', 'Data Entrant', 'Logistics'])
        .limit(20);

    if (error) {
        console.error('DB Error:', error);
        return;
    }

    console.table(dbUsers);
}

checkEventIds();
