import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v5 as uuidv5 } from 'uuid';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const PASSENGER_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('--- Starting Ghost Soul Sync ---');
    try {
        const { data: passengers, error: pError } = await supabase
            .from('passengers')
            .select('*');

        if (pError) throw pError;
        
        console.log(`Fetched ${passengers?.length || 0} total passengers. Example soul_won values:`);
        passengers?.slice(0, 5).forEach(p => console.log(`- ${p.name}: soul_won = ${p.soul_won} (${typeof p.soul_won})`));

        const markedPassengers = passengers?.filter(p => String(p.soul_won).toLowerCase() === 'true' || p.soul_won === true || p.soul_won === 1) || [];

        if (markedPassengers.length === 0) {
            console.log('No passengers with soul_won truthy found in entire db.');
            return;
        }

        console.log(`Found ${markedPassengers.length} passengers actually marked as Soul Won. Checking for missing souls...`);

        const { data: souls, error: sError } = await supabase
            .from('souls')
            .select('id, first_name, last_name');
        
        if (sError) throw sError;
        const existingSoulIds = new Set(souls?.map(s => s.id) || []);

        let syncedCount = 0;
        for (const p of passengers) {
            // Generate deterministic UUID same as frontend does
            let soulId = p.id;
            // Basic UUID validation regex
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)) {
                soulId = uuidv5(p.id, PASSENGER_NAMESPACE);
            }

            if (!existingSoulIds.has(soulId)) {
                console.log(`Missing Soul detected for Passenger: ${p.name} (ID: ${p.id}). Syncing...`);
                
                const nameParts = (p.name || '').split(' ');
                const newSoul = {
                    id: soulId,
                    manifest_id: p.manifest_id, // Important to maintain tenant isolation
                    first_name: nameParts[0] || 'Unknown',
                    last_name: nameParts.slice(1).join(' ') || '',
                    phone: p.contact,
                    gender: p.gender || 'Male',
                    residence: p.residence,
                    status: 'New',
                    source_type: 'Service',
                    source_id: p.event_id,
                    event_id: p.event_id,
                    station_id: p.station_id,
                    vehicle_id: p.vehicle_id,
                    captured_by: '00000000-0000-0000-0000-000000000000',
                };

                const { error: insertError } = await supabase.from('souls').insert(newSoul);
                if (insertError) {
                    console.error(`Failed to insert soul for ${p.name}:`, insertError);
                } else {
                    console.log(`Successfully synced soul for ${p.name}`);
                    syncedCount++;
                }
            }
        }
        
        console.log(`--- Sync Complete. Synced ${syncedCount} missing souls ---`);

    } catch (e) {
        console.error("Error during sync", e);
    }
}

run();
