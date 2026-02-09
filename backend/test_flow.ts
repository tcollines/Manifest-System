
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function testVehicleFlow() {
    console.log("Testing Vehicle Flow...");

    const testPlate = 'TEST-FLOW-01';

    // 1. Cleanup previous test
    await supabase.from('vehicles').delete().eq('number_plate', testPlate);

    // 2. Create Vehicle
    const { data: v, error: createError } = await supabase.from('vehicles').insert([{
        id: crypto.randomUUID(),
        number_plate: testPlate,
        current_stage: 'Onboarding',
        approvals: { registration: 'Pending', finance: 'Pending' },
        station_id: 'e7ec23be-471d-419d-850f-7b671e8571cf', // MG S&S
        event_id: 'f3976613-0887-4138-b2e1-63a8a5824cdd', // MG
        type: 'Car',
        driver_name: 'Test Driver',
        driver_contact: '0700000000',
        coordinator: 'Test Coord'
    }]).select().single();

    if (createError) { console.error("Create failed", createError); return; }
    console.log("Created:", v.number_plate, v.current_stage);

    // 3. Approve Registration (Reflecting RegistrationDashboard logic)
    const { data: vReg, error: regError } = await supabase.from('vehicles').update({
        current_stage: 'FinanceApproval',
        approvals: { registration: 'Approved', finance: 'Pending' }
    }).eq('id', v.id).select().single();

    if (regError) { console.error("Reg Approve failed", regError); return; }
    console.log("Reg Approved:", vReg.number_plate, vReg.current_stage);

    // 4. Approve Finance (Reflecting FinanceDashboard logic)
    // FinanceDashboard logic:
    // updates finance details AND approvals.finance AND current_stage -> Transit
    const { data: vFin, error: finError } = await supabase.from('vehicles').update({
        current_stage: 'Transit',
        approvals: { registration: 'Approved', finance: 'Approved' },
        finance_details: { ongoingDispatch: '100000', ongoingBalance: '0', processedAt: new Date().toISOString() }
    }).eq('id', v.id).select().single();

    if (finError) { console.error("Fin Approve failed", finError); return; }
    console.log("Fin Approved:", vFin.number_plate, vFin.current_stage);

    // Cleanup
    await supabase.from('vehicles').delete().eq('id', v.id);
    console.log("Test finished.");
}

testVehicleFlow();
