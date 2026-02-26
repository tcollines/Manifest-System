import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function sampleServiceIds() {
    const { data: att } = await supabase.from('service_attendance').select('service_id').limit(10);
    console.log('Sample Service IDs:');
    att?.forEach(a => {
        console.log(`ID: "${a.service_id}" (Length: ${a.service_id.length})`);
    });

    // Also check for '378' anywhere in any service_id
    const { data: all } = await supabase.from('service_attendance').select('service_id');
    const matches = all?.filter(a => a.service_id.toLowerCase().includes('378'));
    console.log(`\nFound ${matches?.length || 0} records containing '378' in service_id.`);
    if (matches && matches.length > 0) {
        console.log(`Example Match: "${matches[0].service_id}" (Length: ${matches[0].service_id.length})`);
    }
}

sampleServiceIds();
