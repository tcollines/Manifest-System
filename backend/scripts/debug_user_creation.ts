
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectRecentUsers() {
    console.log('--- INSPECTING RECENT USERS ---');

    // Fetch the last 5 users created
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching users:', error.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No users found.');
        return;
    }

    users.forEach(u => {
        console.log(`\nUser: ${u.name} (${u.role})`);
        console.log(`ID: ${u.id}`);
        console.log(`Event ID: ${u.event_id}`);
        console.log(`Station ID: ${u.station_id}`);
        console.log(`Created At: ${u.created_at}`);
        console.log(`Department ID: ${u.department_id}`);
    });
}

inspectRecentUsers();
