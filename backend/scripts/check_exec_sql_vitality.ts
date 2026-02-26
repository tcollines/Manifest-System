import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function applyConstraint() {
    console.log('Applying FK Constraint via vitality script shell...');

    const query = `
        ALTER TABLE service_attendance 
        ADD CONSTRAINT fk_service_attendance_member_id 
        FOREIGN KEY (member_id) REFERENCES members(id);
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: query });

    if (error) {
        const msg = error.message || JSON.stringify(error);
        if (msg.includes('already exists') || msg.includes('relation "fk_service_attendance_member_id" already exists')) {
            console.log('✅ Constraint ALREADY EXISTS (Confirmed via Error).');
        } else {
            console.error('❌ Failed:', error);
        }
    } else {
        console.log('✅ SUCCESS: Constraint added.');
    }
}

applyConstraint();
