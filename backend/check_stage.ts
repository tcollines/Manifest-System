
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkVehicleStatus() {
    console.log("Checking Vehicle Status...");

    // Summary of stages for Registration Approved vehicles
    const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, number_plate, current_stage, approvals')
        .contains('approvals', { registration: 'Approved' });

    if (vehicles) {
        console.log(`Total Registration Approved: ${vehicles.length}`);
        const counts: Record<string, number> = {};
        vehicles.forEach(v => {
            const stage = v.current_stage || 'NULL';
            counts[stage] = (counts[stage] || 0) + 1;
        });
        console.log("Stage Distribution:", counts);

        // Check for Finance Approved but NOT Transit/Completed
        const financeApproved = vehicles.filter(v => v.approvals?.finance === 'Approved');
        console.log(`\nTotal Finance Approved: ${financeApproved.length}`);
        const fCounts: Record<string, number> = {};
        financeApproved.forEach(v => {
            const stage = v.current_stage || 'NULL';
            fCounts[stage] = (fCounts[stage] || 0) + 1;
        });
        console.log("Finance Approved Stage Distribution:", fCounts);

        // List specific problematic ones (Finance Approved but Audit/RegApproval/etc)
        const problematic = financeApproved.filter(v => v.current_stage !== 'Transit' && v.current_stage !== 'Completed' && v.current_stage !== 'Arrived');
        if (problematic.length > 0) {
            console.log("\nProblematic Vehicles (Finance Approved but wrong stage):");
            problematic.forEach(v => console.log(`${v.number_plate}: ${v.current_stage}`));
        }
    }
}

checkVehicleStatus();
