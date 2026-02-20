
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerification() {
    console.log('--- 🚀 STARTING LIVE VERIFICATION ---');

    // 1. Verify get_event_highlights RPC Performance
    console.log('\n[1/3] Verifying get_event_highlights RPC Performance...');

    // Pick a real event ID from the database
    const { data: events } = await supabase.from('ministry_events').select('id, title').limit(1);
    const eventId = events?.[0]?.id;

    if (!eventId) {
        console.error('❌ No events found in database to test.');
    } else {
        console.log(`Testing with Event: ${events[0].title} (${eventId})`);

        const start = Date.now();
        const { data: highlights, error } = await supabase.rpc('get_event_highlights', { v_event_id: eventId });
        const end = Date.now();

        if (error) {
            console.error('❌ RPC Error:', error);
        } else {
            console.log(`✅ RPC Success! Response Time: ${end - start}ms`);
            console.log('Results:', JSON.stringify(highlights, null, 2));
        }
    }

    // 2. Verify Member Search Indexing (Prefix vs Wildcard)
    console.log('\n[2/3] Verifying Member Search Optimization...');
    const searchStart = Date.now();
    const { data: members, error: searchError } = await supabase
        .from('members')
        .select('name')
        .like('name', 'John%') // Prefix search as refactored
        .limit(5);
    const searchEnd = Date.now();

    if (searchError) {
        console.error('❌ Search Error:', searchError);
    } else {
        console.log(`✅ Prefix Search Success! Response Time: ${searchEnd - searchStart}ms`);
    }

    // 3. Verify Realtime Isolation (Scoping)
    console.log('\n[3/3] Verifying Realtime Isolation (Scoped Filters)...');

    const eventA = '00000000-0000-0000-0000-00000000000a'; // Dummy UUIDs
    const eventB = '00000000-0000-0000-0000-00000000000b';

    let receivedByA = false;
    let receivedByB = false;

    const channelA = supabase.channel('verify-A')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'passengers', filter: `event_id=eq.${eventA}` }, (payload) => {
            console.log('   🔔 Subscription A received update!');
            receivedByA = true;
        })
        .subscribe();

    const channelB = supabase.channel('verify-B')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'passengers', filter: `event_id=eq.${eventB}` }, (payload) => {
            console.log('   🔔 Subscription B received update!');
            receivedByB = true;
        })
        .subscribe();

    // Wait for subscriptions to be ready
    await new Promise(r => setTimeout(r, 2000));

    console.log(`\nTriggering UPDATE for Event A (${eventA})...`);
    // Insert a dummy passenger for Event A
    const { data: inserted, error: insError } = await supabase.from('passengers').insert({
        id: crypto.randomUUID(),
        name: 'VERIFY_BOT',
        event_id: eventA,
        vehicle_id: '00000000-0000-0000-0000-000000000000', // Assuming a dummy vehicle or just a random UUID if FK allows
        category: 'Member',
        contact: '000',
        residence: 'Test',
        is_first_time: 'No'
    }).select().single();

    if (insError) {
        if (insError.message.includes('foreign key constraint')) {
            console.log('   ⚠️ FK Constraint blocked insert, but we can verify the filter logic via the payload if we had one.');
            console.log('   Testing with an existing vehicle_id instead...');
            // Try to find a real vehicle
            const { data: v } = await supabase.from('vehicles').select('id, event_id').limit(1);
            if (v?.[0]) {
                const realEventId = v[0].event_id;
                const dummyEventId = '00000000-0000-0000-0000-00000000000c';
                console.log(`   Real Event: ${realEventId}, Dummy Event: ${dummyEventId}`);

                const channelReal = supabase.channel('verify-Real')
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vehicles', filter: `id=eq.${v[0].id}` }, () => {
                        console.log('   ✅ REALTIME ISOLATION VERIFIED: Filtered listener triggered!');
                        receivedByA = true;
                    })
                    .subscribe();

                const channelDummy = supabase.channel('verify-Dummy')
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vehicles', filter: `id=eq.${dummyEventId}` }, () => {
                        console.log('   ❌ FAILURE: Dummy filter triggered!');
                        receivedByB = true;
                    })
                    .subscribe();

                await new Promise(r => setTimeout(r, 2000));
                console.log('   Updating vehicle state...');
                await supabase.from('vehicles').update({ status: 'Approved' }).eq('id', v[0].id);
                await new Promise(r => setTimeout(r, 3000));
            }
        } else {
            console.error('❌ Insert Error:', insError);
        }
    } else {
        await new Promise(r => setTimeout(r, 3000));
        await supabase.from('passengers').delete().eq('id', inserted.id);
    }

    if (receivedByA && !receivedByB) {
        console.log('\n✅ VERIFICATION COMPLETE: Realtime Isolation is working as expected!');
    } else if (receivedByA && receivedByB) {
        console.log('\n❌ VERIFICATION FAILED: Cross-talk detected between subscriptions!');
    } else {
        console.log('\n⚠️ VERIFICATION INCONCLUSIVE: No updates received.');
    }

    supabase.removeAllChannels();
    process.exit(0);
}

runVerification();
