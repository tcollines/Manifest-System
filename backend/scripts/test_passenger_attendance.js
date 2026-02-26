
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- TEST: Does Adding Passenger Create Attendance? (JS) ---');

    // 1. Create Test Data
    const eventId = uuidv4();
    const vehicleId = uuidv4();

    console.log(`Test Event ID: ${eventId}`);

    try {
        // A. Create Event (Non-Service)
        const { error: errE } = await supabase.from('ministry_events').insert({
            id: eventId,
            title: 'Test Passenger Event JS',
            date: new Date().toISOString().split('T')[0],
            type: 'Conference',
            status: 'Active'
        });
        if (errE) throw new Error(`Event Create Failed: ${errE.message}`);

        // B. Create Vehicle
        const { error: errV } = await supabase.from('vehicles').insert({
            id: vehicleId,
            event_id: eventId,
            number_plate: 'TEST 888X',
            driver_name: 'Test Driver JS',
            driver_contact: '256700000000',
            status: 'Loading'
        });
        if (errV) throw new Error(`Vehicle Create Failed: ${errV.message}`);

        // C. Insert into PASSENGERS
        const passengerId = uuidv4();
        const { error: errP } = await supabase.from('passengers').insert({
            id: passengerId,
            vehicle_id: vehicleId,
            event_id: eventId, // Important
            name: 'Test Passenger JS',
            contact: '256777888000',
            category: 'Member',
            gender: 'Male'
        });

        if (errP) throw new Error(`Passenger Add Failed: ${errP.message}`);
        console.log('Passenger Added successfully.');

        // 2. CHECK ATTENDANCE
        // Does a record exist in service_attendance for this event?
        // Since we didn't link a member_id, only a trigger could create an orphan or if it looks up by name.
        // Wait, if passengers have no member_id, a trigger CANNOT insert into service_attendance easily unless it creates a dummy member or looks up by name.

        // Let's create a MEMBER first to be realistic. Most users add existing members.
        // If the user adds by NAME, does the system resolve it?

        // CASE 1: Passenger added by name (no member_id column in passengers table usually? Check schema...)
        // Use 'inspect_schema' logic if needed, but let's assume 'passengers' has no 'member_id' column based on previous code.

        const { data: att } = await supabase
            .from('service_attendance')
            .select('*')
            .eq('service_id', eventId);

        if (att && att.length > 0) {
            console.log('❌ UNEXPECTED: Attendance record FOUND!', att);
            console.log('   This confirms a trigger or logic exists.');
        } else {
            console.log('✅ PASS: No attendance record found.');
        }

    } catch (e) {
        console.error('Test Failed:', e.message);
    } finally {
        // Cleanup
        await supabase.from('passengers').delete().eq('event_id', eventId);
        await supabase.from('vehicles').delete().eq('event_id', eventId);
        await supabase.from('ministry_events').delete().eq('id', eventId);
    }
}

run();
