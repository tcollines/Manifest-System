import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSouls() {
    const manifestId = '0b1b9e28-3e42-4f9a-8a1a-8c6c8e3a4d9b'; // Extracted from earlier tests or an arbitrary manifest_id if known

    try {
        console.log("Checking DB directly for Manifest:", manifestId);

        // 1. Fetch individual souls from public.souls
        const { data: individualSouls, error: soulsError } = await supabase
            .from('souls')
            .select('id')
        // .eq('manifest_id', manifestId);

        console.log("Public Souls:", individualSouls?.length || 0, soulsError || '');

        // 2. Fetch souls_won from passengers
        const { data: passengers, error: passengersError } = await supabase
            .from('passengers') // Found actual table name
            .select('id')
            // .eq('manifest_id', manifestId)
            .eq('soul_won', true);

        const eventSum = passengers ? passengers.length : 0;
        console.log("Events Souls:", eventSum, passengersError || '');

        // 3. Fetch souls_won from residence_outreach_reports
        const { data: reports, error: reportsError } = await supabase
            .from('residence_outreach_reports')
            .select('souls_won')
        // .eq('manifest_id', manifestId);

        const reportSum = reports ? reports.reduce((sum, report) => sum + (report.souls_won || 0), 0) : 0;
        console.log("Outreach Souls:", reportSum, reportsError || '');

    } catch (e) {
        console.error(e);
    }
}

checkSouls();
