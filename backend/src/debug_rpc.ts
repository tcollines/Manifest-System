
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'd:/Manifest System/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    const testId = '11111111-2222-3333-4444-555555555555';
    const payload = {
        _id: testId,
        _name: 'Test RPC User',
        _category: 'Member',
        _phone: '256700000000',
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _residency: 'Kampala',
        _born_again: true,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: []
    };

    console.log('Testing RPC with payload:', JSON.stringify(payload, null, 2));

    const { data, error } = await supabase.rpc('submit_member_entry', payload);

    if (error) {
        console.error('FAILURE_RPC:', JSON.stringify(error));
    } else {
        console.log('SUCCESS_RPC:', JSON.stringify(data));
    }
}

testRpc();
