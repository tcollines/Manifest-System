
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'd:/Manifest System/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const debugLegacy = async () => {
    console.log("--- DEBUG LEGACY ERROR ---");
    const timestamp = Date.now();
    const legacyPayload = {
        _id: null,
        _name: `LegacyErr_${timestamp}`,
        _phone: `25674${timestamp.toString().slice(-7)}`,
        _category: 'Member',
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _residency: 'DebugCity',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: ['e-legacy-test']
    };

    const { error } = await supabase.rpc('submit_member_entry', legacyPayload);

    if (error) {
        console.log("Error:", error.message);
        fs.writeFileSync('legacy_error.txt', JSON.stringify(error, null, 2));
    } else {
        console.log("Success (Unexpected based on previous run)");
        fs.writeFileSync('legacy_error.txt', "SUCCESS");
    }
};

debugLegacy();
