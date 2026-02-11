
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify(eventUuid: string, title: string) {
    console.log(`\n--- Verifying Highlights Logic for: ${title} ---`);

    // Mocking the controller logic...
    const eventQuery = supabase.from('ministry_events').select('*').eq('id', eventUuid).single();
    const attendanceQuery = supabase.from('service_attendance').select('member_id').eq('service_id', eventUuid);
    const soulsQuery = supabase.from('souls').select('id').or(`event_id.eq.${eventUuid},source_id.eq.${eventUuid}`);
    const nextGenSoulsQuery = supabase.from('next_gen_souls').select('id').eq('service_id', eventUuid);
    const financeQuery = supabase.from('transactions').select('amount').eq('event_id', eventUuid).eq('type', 'Expense');

    const [
        { data: eventData },
        { data: attendanceData },
        { data: soulsData },
        { data: nextGenData },
        { data: financeData }
    ] = await Promise.all([
        eventQuery,
        attendanceQuery,
        soulsQuery,
        nextGenSoulsQuery,
        financeQuery
    ]);

    let fleetCount = 0, logisticsChildren = 0, pCount = 0, pFirstTimers = 0, pStudents = 0, pInstitutions = 0, pSouls = 0, fleetExpenditure = 0;

    const { data: stations } = await supabase.from('pickup_stations').select('id').eq('event_id', eventUuid);
    if (stations && stations.length > 0) {
        const stationIds = stations.map(s => s.id);
        const { data: vehicles } = await supabase.from('vehicles').select('id, children, finance_details').in('station_id', stationIds);
        if (vehicles && vehicles.length > 0) {
            fleetCount = vehicles.length;
            logisticsChildren = vehicles.reduce((acc, v) => acc + (v.children || 0), 0);
            fleetExpenditure = vehicles.reduce((acc, v) => acc + (v.finance_details?.ongoingDispatch ? parseFloat(v.finance_details.ongoingDispatch) || 0 : 0), 0);
            const vehicleIds = vehicles.map(v => v.id);
            const { data: passengers } = await supabase.from('passengers').select('id, is_first_time, category, soul_won').in('vehicle_id', vehicleIds);
            if (passengers) {
                pCount = passengers.length;
                pFirstTimers = passengers.filter(p => p.is_first_time === 'Yes').length;
                pStudents = passengers.filter(p => p.category === 'Student').length;
                pInstitutions = passengers.filter(p => p.category === 'Institution').length;
                pSouls = passengers.filter(p => p.soul_won === true).length;
            }
        }
    }

    const { count: pcCount } = await supabase.from('personal_vehicles').select('*', { count: 'exact', head: true }).or(`current_service_id.eq.${eventUuid},attended_service_ids.cs.{"${eventUuid}"}`);
    const serviceAttendanceCount = attendanceData?.length || 0;
    const soulsTotal = (soulsData?.length || 0) + (nextGenData?.length || 0) || pSouls;
    const financeExpenditure = financeData?.reduce((acc, t) => acc + (t.amount || 0), 0) || 0;
    const finalAttendees = Math.max(pCount + logisticsChildren, serviceAttendanceCount);
    const snapshot = eventData?.stats || {};

    const response = {
        vehicles: fleetCount || snapshot.vehicles || 0,
        personalCars: pcCount || snapshot.personalCars || 0,
        students: pStudents || snapshot.students || 0,
        institutions: pInstitutions || snapshot.institutions || 0,
        attendees: finalAttendees || snapshot.attendees || 0,
        firstTimers: pFirstTimers || snapshot.firstTimers || 0,
        soulsWon: soulsTotal || snapshot.soulsWon || 0,
        children: logisticsChildren || snapshot.children || 0,
        expenditure: (fleetExpenditure + financeExpenditure) || (snapshot.expenditure ? parseFloat(snapshot.expenditure.replace(/,/g, '')) : 0) || 0
    };

    console.log(`Results:`, JSON.stringify(response, null, 2));
}

async function run() {
    await verify('38975f9c-5f10-4a62-8917-3ecd94896a76', 'S378 (Live Service)');
    await verify('11324002-c401-494b-be68-179650967970', 'The Inter-Schools Conference 2026 (Historical Event)');
    await verify('bde9329f-2746-40b1-b2eb-56f2fcf028ee', 'Night Of Prayer (Historical Event)');
}

run();
