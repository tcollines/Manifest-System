
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv'; // Ensure you have this installed or use standard fs reading if strict

// Manual Env Parsing fallback if dotenv fails (sometimes issues with ts-node)
function loadEnvRequest() {
    const envPath = 'd:\\Manifest System\\backend\\.env';
    if (fs.existsSync(envPath)) {
        console.log(`Loading .env from ${envPath}`);
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    } else {
        console.error(`.env file not found at ${envPath}`);
    }
}

loadEnvRequest();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Keys found:', Object.keys(process.env).filter(k => k.startsWith('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runAudit() {
    console.log('--- STARTING DATABASE PERFOMANCE AUDIT V2 ---');

    try {
        // 1. Get a recent event UUID using basic select
        const { data: events, error: evError } = await supabase
            .from('ministry_events')
            .select('id, title, date')
            .eq('type', 'Service')
            .order('date', { ascending: false })
            .limit(1);

        if (evError) {
            console.error('Error fetching events:', evError);
            return;
        }

        const eventId = events?.[0]?.id;
        console.log(`Test Event ID: ${eventId} (${events?.[0]?.title}) - ${events?.[0]?.date}`);

        if (!eventId) {
            console.error('No events found to test with.');
            return;
        }

        // 2. Measure get_event_highlights Latency
        console.log('\n--- 2. Analyzing get_event_highlights (RPC) ---');
        const startRpc = performance.now();
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_event_highlights', { event_uuid: eventId });
        const endRpc = performance.now();
        const duration = (endRpc - startRpc).toFixed(2);
        console.log(`RPC Execution Time (Client-side): ${duration}ms`);
        if (rpcError) {
            console.error('RPC Error:', rpcError);
        } else {
            console.log('RPC Response Size (approx chars):', JSON.stringify(rpcData).length);
        }

        // 3. Test Member Search (Leading Wildcard Impact) - "Ab" short search
        console.log('\n--- 3. Analyzing Member Search (Leading Wildcard) ---');
        const startSearch = performance.now();
        const { count: searchCount, error: searchError } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .ilike('name', '%Abraham%'); // Leading wildcard
        const endSearch = performance.now();
        console.log(`Search 'name ilike %Abraham%' Time: ${(endSearch - startSearch).toFixed(2)}ms, Results: ${searchCount}`);

        // Compare with Index-friendly search (Prefix)
        const startPrefix = performance.now();
        const { count: prefixCount } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .ilike('name', 'Abraham%'); // Prefix only
        const endPrefix = performance.now();
        console.log(`Search 'name ilike Abraham%' (Prefix) Time: ${(endPrefix - startPrefix).toFixed(2)}ms, Results: ${prefixCount}`);


        // 4. Test Service Attendance Fetch
        console.log('\n--- 4. Analyzing Service Attendance Fetch ---');
        const startAtt = performance.now();
        const { count: attCount, error: attError } = await supabase
            .from('service_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', eventId);
        const endAtt = performance.now();
        console.log(`Fetch service_attendance Time: ${(endAtt - startAtt).toFixed(2)}ms, Count: ${attCount}`);

        // 6. Table Row Counts (Estimate)
        console.log('\n--- 5. Table Row Counts ---');
        const tables = ['members', 'service_attendance', 'souls', 'vehicles', 'passengers', 'ministry_events', 'transactions'];
        for (const t of tables) {
            const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
            console.log(`Table '${t}' Rows: ${count}`);
        }

    } catch (err: any) {
        console.error('Audit failed:', err.message);
    }
}

runAudit();
