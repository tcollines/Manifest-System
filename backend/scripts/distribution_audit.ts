import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function auditDistribution() {
    const { data, error } = await supabase.rpc('debug_sql', { sql_query: "SELECT service_id, COUNT(*) FROM service_attendance GROUP BY service_id ORDER BY COUNT(*) DESC" });
    if (error) {
        console.log('RPC Failed, trying simple fetch...');
        const { data: all } = await supabase.from('service_attendance').select('service_id');
        const counts: Record<string, number> = {};
        all?.forEach(a => counts[a.service_id] = (counts[a.service_id] || 0) + 1);
        console.log('Counts:', counts);
    } else {
        console.log('Counts (from SQL):', data);
    }
}

auditDistribution();
