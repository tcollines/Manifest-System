import { config as loadEnv } from 'dotenv';
import { resolve as resolveEnvPath } from 'path';
loadEnv({ path: resolveEnvPath(__dirname, '.env') });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    try {
        const eventId = '480d37e6-ad32-4b59-abbc-0944977b00b2'; // P578

        // Check if there are children with this event format either as string array or natively
        console.log("Fetching children with P578...");
        
        // Let's get ALL children and check in JS since postgres arrays can be tricky
        const { data: allChildren } = await supabase
            .from('children')
            .select('id, attended_service_ids');
            
        let childrenCount = 0;
        if (allChildren) {
            allChildren.forEach(child => {
                if (child.attended_service_ids && Array.isArray(child.attended_service_ids)) {
                    if (child.attended_service_ids.includes(eventId)) {
                        childrenCount++;
                    }
                }
            });
        }
        
        console.log(`Children attached to P578: ${childrenCount}`);

        // Check passengers
        const { count: passCount } = await supabase
            .from('passengers')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId);
            
        console.log(`Passengers in P578: ${passCount}`);

    } catch (e) {
        console.error(e);
    }
}
main();
