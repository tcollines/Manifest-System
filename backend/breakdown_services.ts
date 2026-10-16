import { config as loadEnv } from 'dotenv';
import { resolve as resolveEnvPath } from 'path';
loadEnv({ path: resolveEnvPath(__dirname, '.env') });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    try {
        // 1. Fetch souls won from services
        let allData: any[] = [];
        let start = 0;
        let limit = 1000;
        let hasMore = true;
        
        while (hasMore) {
            const { data, error } = await supabase
                .from('unified_souls_won')
                .select('source_category, source_id, soul_count')
                .eq('source_category', 'Service')
                .range(start, start + limit - 1);

            if (error) throw error;
            if (data.length === 0) {
                hasMore = false;
            } else {
                allData = [...allData, ...data];
                start += limit;
                if (data.length < limit) hasMore = false;
            }
        }

        // 2. Fetch all services to map their titles
        const { data: services, error: servicesError } = await supabase
            .from('ministry_events')
            .select('id, title, date')
            .eq('type', 'Service');
        
        if (servicesError) throw servicesError;

        const serviceMap = new Map<string, string>();
        services.forEach(s => {
            const dateStr = s.date ? new Date(s.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Date';
            serviceMap.set(s.id, `${s.title} (${dateStr})`);
        });
        
        let total = 0;
        const breakdown: Record<string, number> = {};

        allData.forEach((s: any) => {
            const count = s.soul_count || 1;
            total += count;
            
            let name = "Unknown Service";
            if (s.source_id) {
                name = serviceMap.get(s.source_id) || `Deleted/Unknown Service (${s.source_id})`;
            }
            breakdown[name] = (breakdown[name] || 0) + count;
        });

        console.log("--- SOULS WON PER SERVICE ---");
        for (const [key, val] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
            console.log(`${val} : ${key}`);
        }
        console.log("---------------------------");
        console.log(`TOTAL SOULS FROM SERVICES: ${total}`);

    } catch (e) {
        console.error(e);
    }
}
main();
