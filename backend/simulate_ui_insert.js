require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');

async function simulateFrontendInsert() {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Simulate exactly what TransportationDashboard passes to UserStore.add()
    const payload = {
        name: 'Test Vehicle Coord 99',
        role: 'Vehicle Coordinator',
        department_id: 'd5', // The suspect frontend hardcoded value
        event_id: 'f3976613-0887-4138-b2e1-63a8a5824cdd',
        manifest_id: '1',
        status: 'Active',
        username: 'testvc99',
        password: 'password123'
    };

    console.log('--- Attempting INSERT exactly as the frontend tries it ---');
    const { data, error } = await sb.from('users').insert([payload]).select();

    if (error) {
        console.error('INSERT FAILED DIRECTLY:', error);
    } else {
        console.log('INSERT SUCCEEDED:', data);
    }
}

simulateFrontendInsert();
