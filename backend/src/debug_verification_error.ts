
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'd:/Manifest System/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const debugError = async () => {
    const timestamp = Date.now();
    const baseName = `DebugUser_${timestamp}`;
    const payload = {
        _id: null,
        _name: baseName,
        _phone: '256700000000',
        _residency: 'DebugCity',
        _category: 'Member',
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: []
    };

    const { data, error } = await supabase.rpc('submit_member_entry', payload);

    if (error) {
        fs.writeFileSync('rpc_error.log', JSON.stringify(error, null, 2));
        console.log("Error written to rpc_error.log");
    } else {
        console.log("Success! ID:", data?.id);
    }
};

debugError();
