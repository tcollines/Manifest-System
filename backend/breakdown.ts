import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://poazorjmzswectxvakzl.supabase.co';
const SUPABASE_KEY = 'sb_secret_M5w-_KV6OtotRjn-KTw9Xg_6iUoezJP';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    try {
        let allData: any[] = [];
        let start = 0;
        let limit = 1000;
        let hasMore = true;
        
        while (hasMore) {
            const { data, error } = await supabase
                .from('unified_souls_won')
                .select('source_category, soul_count')
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
        
        let total = 0;
        const breakdown: Record<string, number> = {};

        allData.forEach((s: any) => {
            const count = s.soul_count || 1;
            total += count;
            breakdown[s.source_category] = (breakdown[s.source_category] || 0) + count;
        });

        console.log("--- SOULS WON BREAKDOWN ---");
        for (const [key, val] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
            console.log(`${key}: ${val}`);
        }
        console.log("---------------------------");
        console.log(`TOTAL SOULS: ${total}`);

    } catch (e) {
        console.error(e);
    }
}
main();
