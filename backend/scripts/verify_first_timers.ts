
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFirstTimers() {
    console.log('--- CHECKING RECENT FIRST TIMERS ---');

    // Fetch last 5 members created who are First Timers
    const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .eq('category', 'First Timer')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching members:", error.message);
        return;
    }

    if (!members || members.length === 0) {
        console.log("No First Timers found.");
        return;
    }

    console.log(`Checking last ${members.length} First Timer records...`);

    for (const m of members) {
        const id = m.id;
        const name = m.name;
        const created = m.created_at;
        const ftServiceId = m.first_timer_service_id;
        const ftServiceIdLegacy = m.legacy_first_timer_service_id || 'N/A';
        const attended = m.attended_service_ids;

        console.log(`[${created}] ${name} (ID: ${id})`);
        console.log(`   - First Timer Service ID: ${ftServiceId || 'NULL'} (Legacy: ${ftServiceIdLegacy})`);
        console.log(`   - Attended: ${JSON.stringify(attended)}`);

        if (!ftServiceId) {
            console.error(`   ❌ MISSING: first_timer_service_id is NULL.`);
        } else {
            console.log(`   ✅ OK: first_timer_service_id is present.`);
        }
        console.log('---');
    }
}

checkFirstTimers();
