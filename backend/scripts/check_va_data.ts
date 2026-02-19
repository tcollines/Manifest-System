
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function run() {
    console.log("--- CHECKING VOLUNTEER ATTENDANCE ---");

    // Check for invalid volunteer_ids
    const { data: records, error } = await supabase
        .from('volunteer_attendance')
        .select('volunteer_id');

    if (error) {
        console.error("Error:", error);
        return;
    }

    const total = records.length;
    const invalid = records.filter(r => !UUID_REGEX.test(r.volunteer_id));

    console.log(`Total Rows: ${total}`);
    console.log(`Invalid IDs: ${invalid.length}`);

    if (invalid.length > 0) {
        console.log("Sample Invalid:", invalid[0].volunteer_id);
    } else {
        console.log("✅ All volunteer_ids are valid UUIDs (or empty).");
    }
}

run();
