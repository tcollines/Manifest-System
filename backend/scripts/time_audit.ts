import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function timeAudit() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const { data: att } = await supabase.from('service_attendance').select('*').eq('service_id', serviceId);

    if (att && att.length > 0) {
        console.log(`Found ${att.length} records for S378.`);
        const arthurTime = '17:16:34';
        const matches = att.filter(a => a.check_in_time && a.check_in_time.includes(arthurTime));
        console.log(`Records matching Arthur's time (${arthurTime}):`, matches);

        if (matches.length > 0) {
            console.log(`Found stale UUID for Arthur: ${matches[0].member_id}`);
        }
    }
}

timeAudit();
