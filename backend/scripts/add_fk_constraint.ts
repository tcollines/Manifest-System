
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Force load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addConstraint() {
    console.log('Adding foreign key constraint fk_service_attendance_member_id...');

    const query = `
        ALTER TABLE service_attendance 
        ADD CONSTRAINT fk_service_attendance_member_id 
        FOREIGN KEY (member_id) REFERENCES members(id);
    `;

    // Try executing
    const { error } = await supabase.rpc('exec_sql', { sql_query: query });

    if (error) {
        // Check for specific error messages
        const msg = error.message || JSON.stringify(error);
        if (msg.includes('already exists') || msg.includes('relation "fk_service_attendance_member_id" already exists')) {
            console.log('✅ Constraint ALREADY EXISTS. Skipping.');
        } else {
            console.error('❌ Failed to add constraint:', error);
        }
    } else {
        console.log('✅ SUCCESS: Constraint added successfully.');
    }
}

addConstraint().catch(console.error);
