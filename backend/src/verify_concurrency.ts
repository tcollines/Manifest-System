import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: resolveEnvPath(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const verifyConcurrency = async () => {
    console.log("--- STARTING CONCURRENCY VERIFICATION ---");
    const timestamp = Date.now();
    const baseName = `ConcurrentUser_${timestamp}`;
    const basePhone = `25678${timestamp.toString().slice(-7)}`;
    const residency = '  Kampala  '; // Note extra spaces to test normalization

    const payload = {
        _id: null,
        _name: baseName,
        _phone: basePhone,
        _residency: residency,
        _category: 'Member',
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: []
    };

    console.log(`Payload Name: '${baseName}'`);

    // 1. Launch 5 simultaneous requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
        // We pass the payload exactly as is (with _id: null) or nulls.
        // If we want to simulate client generating IDs, we'd pass UUIDs. 
        // But the RPC handles _id: null by generating one.
        // Let's stick to _id: null to test the conflict logic on business keys.
        promises.push(
            supabase.rpc('submit_member_entry', payload)
                .then(res => ({ idx: i, ...res }))
        );
    }

    console.log("Launched 5 concurrent requests...");
    const results = await Promise.all(promises);

    // 2. Analyze Results
    const ids = results.map(r => r.data?.id).filter(Boolean);
    const uniqueIds = [...new Set(ids)];

    console.log(`Results received: ${results.length}`);
    console.log(`Unique IDs returned: ${uniqueIds.length} (Should be 1)`);
    console.log(`IDs:`, uniqueIds);

    results.forEach(r => {
        if (r.error) {
            console.error(`Req ${r.idx} ERROR:`, r.error);
        } else {
            const meta = r.data?._meta;
            console.log(`Req ${r.idx}: Action=${meta?.action}, Reason=${meta?.match_reason}, ID=${r.data?.id}`);
        }
    });

    if (results.some(r => r.error)) {
        console.error("❌ FAILURE: RPC returned errors.");
        return;
    }

    if (uniqueIds.length === 1 && uniqueIds[0]) {
        console.log("✅ SUCCESS: Concurrency handling worked. Single record enforced.");
    } else {
        console.error(`❌ FAILURE: Multiple records created (Count: ${uniqueIds.length}). IDs:`, uniqueIds);
    }
};

verifyConcurrency();
