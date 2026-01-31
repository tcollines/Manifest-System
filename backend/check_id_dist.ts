
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function checkDistribution(table: string, prefix: string) {
    const { data: legacy, error: lErr } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .ilike('id', `${prefix}%`);

    const { count: total, error: tErr } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

    if (tErr) console.error(`Error checking ${table}:`, tErr.message);
    else {
        const legacyCount = legacy ? legacy.length : (lErr ? '?' : 0);
        // Note: count is on the response object for head requests usually, but supabase-js distincts
        // Let's just use the returned count property
        console.log(`Table: ${table}`);
        console.log(`  - Total Rows: ${total}`);
        // For legacy count, we need the actual count from the query
        const { count: legCount } = await supabase.from(table).select('id', { count: 'exact', head: true }).ilike('id', `${prefix}%`);
        console.log(`  - Legacy IDs ('${prefix}...'): ${legCount}`);
        console.log(`  - Modern/Other IDs: ${total! - (legCount || 0)}`);
        console.log('-----------------------------------');
    }
}

async function run() {
    console.log("--- ID DISTRIBUTION REPORT ---");
    await checkDistribution('passengers', 'p-');
    await checkDistribution('users', 'u-');
    await checkDistribution('finance_transactions', 't-');
    await checkDistribution('souls', 's-');
}

run();
