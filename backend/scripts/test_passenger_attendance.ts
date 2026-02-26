
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testPassengerAttendance() {
    console.log('--- TEST: Does Adding Passenger Create Attendance? ---');

    // 1. Create Test Data
    const eventId = uuidv4();
    const stationId = uuidv4();
    const vehicleId = uuidv4();
    const memberId = uuidv4(); // We'll add this person as a passenger

    console.log(`Test Event ID: ${eventId}`);
    console.log(`Test Member ID (Passenger): ${memberId}`);

    try {
        // A. Create Event (Non-Service)
        const { error: errE } = await supabase.from('ministry_events').insert({
            id: eventId,
            title: 'Test Passenger Event',
            date: new Date().toISOString().split('T')[0],
            type: 'Conference',
            status: 'Active'
        });
        if (errE) throw new Error(`Event Create Failed: ${errE.message}`);

        // B. Create Vehicle
        const { error: errV } = await supabase.from('vehicles').insert({
            id: vehicleId,
            event_id: eventId,
            number_plate: 'TEST 999X',
            driver_name: 'Test Driver',
            driver_contact: '256700000000',
            status: 'Loading'
        });
        if (errV) throw new Error(`Vehicle Create Failed: ${errV.message}`);

        // C. Create Member (optional, but good for integrity)
        // Actually, passengers table doesn't enforce FK to members table usually, 
        // BUT if there is a trigger that links them, it might require a member record. Be safe.
        // Wait, does 'passengers' table have 'member_id'?
        // Let's check schema via insertion error if needed.
        // Usually passengers has 'name', 'contact', etc. Logic usually matches by name/contact if it links to members.

        // Let's Insert into PASSENGERS
        const passengerId = uuidv4();
        const { error: errP } = await supabase.from('passengers').insert({
            id: passengerId,
            vehicle_id: vehicleId,
            event_id: eventId, // Important
            name: 'Test Passenger Person',
            contact: '256777888999',
            category: 'Member',
            gender: 'Male'
        });

        if (errP) throw new Error(`Passenger Add Failed: ${errP.message}`);
        console.log('Passenger Added successfully.');

        // 2. CHECK ATTENDANCE
        // Does a record exist in service_attendance for this person?
        // We'll search by member_id? 
        // WAIT. Passengers table does NOT have member_id.
        // So how would it link?
        // Unless we are resolving member by name/contact?

        // Let's check if there is ANY attendance for this event.
        const { data: att, error: errAtt } = await supabase
            .from('service_attendance')
            .select('*')
            .eq('service_id', eventId);

        if (errAtt) throw errAtt;

        if (att && att.length > 0) {
            console.log('❌ UNEXPECTED: Attendance record FOUND!', att);
            console.log('   This confirms a trigger or backend logic exists.');
        } else {
            console.log('✅ PASS: No attendance record found.');
            console.log('   This confirms simple "Add Passenger" does NOT check them in.');
        }

    } catch (e: any) {
        console.error('Test Failed:', e.message);
    } finally {
        // Cleanup
        await supabase.from('passengers').delete().eq('event_id', eventId);
        await supabase.from('vehicles').delete().eq('event_id', eventId);
        await supabase.from('ministry_events').delete().eq('id', eventId);
    }
}

testPassengerAttendance();
