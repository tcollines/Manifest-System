
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function repro() {
    console.log('--- REPRODUCING PARKING CHECK-IN ---');

    // 1. Create a dummy vehicle
    // Use a random plate to avoid duplicates
    const plate = `REPRO${Math.floor(Math.random() * 1000)}`;
    const { data: vehicle, error: createError } = await supabase
        .from('personal_vehicles')
        .insert([{
            id: crypto.randomUUID(), // Ensure ID is provided
            number_plate: plate,
            driver_name: 'Repro Driver',
            driver_contact: '256700000000',
            status: 'Absent'
        }])
        .select()
        .single();

    if (createError) {
        console.error('Create Error:', createError);
        return;
    }
    console.log('Created Vehicle:', vehicle.id, vehicle.number_plate);

    // 2. Simulate Check-In (Logic from Controller)
    const serviceId = '00000000-0000-0000-0000-000000000000'; // Dummy Service ID (UUID)
    // Or use a real one if FK constraints exist.
    // Let's check if there is an active service ID first.
    const { data: services } = await supabase.from('ministry_events').select('id').limit(1);
    const validServiceId = services && services.length > 0 ? services[0].id : serviceId;

    console.log('Checking in to Service:', validServiceId);

    const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentHistory = vehicle.attended_service_ids || [];
    const newHistory = currentHistory.includes(validServiceId) ? currentHistory : [...currentHistory, validServiceId];

    // logic from parkingController.ts
    // .or(`id.eq.${toUUID(id)},legacy_id.eq.${id}`)
    // tailored for the script:

    // We test the EXACT logic from the controller using raw query builder if possible or simulating it.
    // The controller uses .or()

    // Since we have the ID, we can just use EQ. But let's verify if .or() works with UUID.

    const { data: updated, error: updateError } = await supabase
        .from('personal_vehicles')
        .update({
            status: 'Checked In',
            current_service_id: validServiceId,
            check_in_time: checkInTime,
            attended_service_ids: newHistory
        })
        .eq('id', vehicle.id) // Fixed logic matching controller
        .select();

    if (updateError) {
        console.error('Update Error:', updateError);
    } else {
        console.log('Update Success. Rows affected:', updated ? updated.length : 0);
        if (updated && updated.length > 0) {
            console.log('Updated Status:', updated[0].status);
        } else {
            console.warn('WARNING: No rows updated despite no error!');
        }
    }

    // 3. Cleanup
    await supabase.from('personal_vehicles').delete().eq('id', vehicle.id);
}

repro();
