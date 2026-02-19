
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runAudit() {
    console.log('--- STARTING DATABASE PERFOMANCE AUDIT ---');

    try {
        // 1. Get a recent event UUID to use for testing
        const { data: events } = await supabase
            .from('ministry_events')
            .select('id, title')
            .eq('type', 'Service')
            .order('date', { ascending: false })
            .limit(1);

        const eventId = events?.[0]?.id;
        console.log(`Test Event ID: ${eventId} (${events?.[0]?.title})`);

        if (!eventId) {
            console.error('No events found to test with.');
            return;
        }

        // 2. Test get_event_highlights (RPC)
        console.log('\n--- 2. Analyzing get_event_highlights (RPC) ---');
        // Note: We wrap in a transaction or just call it. For EXPLAIN ANALYZE via RPC, 
        // Supabase might not expose it directly via .rpc() easily if we want the PLAN.
        // We will try to use .rpc or raw query if possible. 
        // Since we can't easily run raw SQL string with EXPLAIN ANALYZE via standard client unless we have a function for it,
        // we will infer from the "Time taken" or just use a raw query if we have a direct connection (which we don't, we assume HTTP).
        // WAIT: The supabase-js client doesn't support sending raw SQL strings unless we use a specific RPC that executes SQL, which is dangerous/rare.
        // HOWEVER, the user context said "Run or simulate EXPLAIN ANALYZE". 
        // AND "The Manifest System has completed UUID migration". 
        // I will use a custom RPC I'll "create" temporarily? No, I am not allowed to change code.
        // I will try to use the `pg_stat_statements` if available, or just measure latency from the client side.

        // Actually, I can use the `postgres` library if I had the connection string, but I likely only have the URL/Key.
        // Let's assume I can only measure client-side latency for now, AND analyze the SQL *text* I found earlier (Static Analysis).
        // I will still fetch Index/Table stats if possible via RPCs or standard tables.

        const startRpc = performance.now();
        const { error: rpcError } = await supabase.rpc('get_event_highlights', { event_uuid: eventId });
        const endRpc = performance.now();
        console.log(`RPC Execution Time (Client-side): ${(endRpc - startRpc).toFixed(2)}ms`);
        if (rpcError) console.error('RPC Error:', rpcError);

        // 3. Test Member Search (Leading Wildcard)
        console.log('\n--- 3. Analyzing Member Search (Leading Wildcard) ---');
        const startSearch = performance.now();
        const { count: searchCount, error: searchError } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .ilike('name', '%Abraham%');
        const endSearch = performance.now();
        console.log(`Search 'name ilike %Abraham%' Time: ${(endSearch - startSearch).toFixed(2)}ms, Results: ${searchCount}`);
        if (searchError) console.error(searchError);

        // 4. Test Service Attendance Fetch (Simulate getServiceStats)
        console.log('\n--- 4. Analyzing Service Attendance Fetch ---');
        const startAtt = performance.now();
        const { count: attCount, error: attError } = await supabase
            .from('service_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', eventId);
        const endAtt = performance.now();
        console.log(`Fetch service_attendance (Direct UUID) Time: ${(endAtt - startAtt).toFixed(2)}ms, Count: ${attCount}`);
        if (attError) console.error(attError);


        // 5. Index Usage Audit (Querying system catalogs via Rpc if possible, or usually Supabase blocks this)
        // Check if we can select from pg_indexes. Usually restricted.
        console.log('\n--- 5. Index & Table Stats Audit ---');
        // Try requesting internal tables. If this fails, I'll rely on the static file list I saw (migration files).
        const { data: indices, error: idxError } = await supabase
            .from('pg_indexes')
            .select('*')
            .eq('schemaname', 'public');

        if (idxError) {
            console.log('Could not fetch pg_indexes (Expected via Client):', idxError.message);
            // Fallback: Check for a specific 'get_indexes' RPC if it exists, otherwise manual check.
        } else {
            console.log(`Found ${indices?.length} indexes.`);
            indices?.forEach(idx => {
                // console.log(`- ${idx.tablename}: ${idx.indexname} (${idx.indexdef})`);
            });
            // Check specific missing ones
            const indexDefs = indices?.map(i => i.indexdef) || [];
            const hasServiceIdIdx = indexDefs.some(d => d.includes('service_attendance') && d.includes('service_id'));
            console.log(`Index on service_attendance(service_id): ${hasServiceIdIdx ? 'YES' : 'NO'}`);
        }

        // 6. Table Row Counts (Estimate)
        const tables = ['members', 'service_attendance', 'souls', 'vehicles', 'passengers', 'ministry_events'];
        for (const t of tables) {
            const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
            console.log(`Table '${t}' Rows: ${count}`);
        }

    } catch (err) {
        console.error('Audit failed:', err);
    }
}

runAudit();
