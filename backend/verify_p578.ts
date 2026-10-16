import { config as loadEnv } from 'dotenv';
import { resolve as resolveEnvPath } from 'path';
loadEnv({ path: resolveEnvPath(__dirname, '.env') });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    try {
        console.log("Finding P578...");
        const { data: p578 } = await supabase
            .from('ministry_events')
            .select('id, title')
            .ilike('title', '%P578%')
            .limit(1)
            .single();
        
        if (!p578) {
            console.log("P578 not found");
            return;
        }
        
        const eventId = p578.id;
        console.log(`Event ID for P578: ${eventId}`);

        const { count: rawCount } = await supabase
            .from('service_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', eventId);
            
        console.log(`P578 Default Registration Count (all rows): ${rawCount}`);

        // Try getting distinct member_ids via raw postgrest or just fetching to count
        const { data: allScans } = await supabase
            .from('service_attendance')
            .select('member_id')
            .eq('service_id', eventId);
            
        const uniqueMembers = new Set(allScans?.map(s => s.member_id));
        console.log(`P578 Unique Members Count (DISTINCT member_id): ${uniqueMembers.size}`);

    } catch (e) {
        console.error(e);
    }
}
main();
