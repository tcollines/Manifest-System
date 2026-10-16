import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: resolveEnvPath(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const verifyState = async () => {
    console.log("--- FINAL DATABASE VERIFICATION ---");
    const logData: any = {};

    // 1. Verify Indexes
    try {
        const { data: indexes, error } = await supabase
            .from('pg_indexes')
            .select('indexname, indexdef')
            .eq('tablename', 'members');
        logData.indexes = error ? { error: error.message } : indexes;
        console.log("Indexes checked.");
    } catch (e: any) { logData.indexes = { error: e.message }; }

    // 2. Verify Columns (Members)
    try {
        const { data: rows } = await supabase.from('members').select('*').limit(1);
        logData.memberColumns = rows && rows.length > 0 ? Object.keys(rows[0]) : "No rows to infer columns";
        console.log("Member columns checked.");

        // 2b. Verify Columns (Service Attendance) service_id type inference
        const { data: rowsAtt } = await supabase.from('service_attendance').select('*').limit(1);
        logData.attendanceColumns = rowsAtt && rowsAtt.length > 0 ? rowsAtt[0] : "No rows to infer columns";
        console.log("Attendance columns checked.");
    } catch (e: any) { logData.columnsError = e.message; }

    // 3. RPC Legacy ID Test
    console.log("Testing Legacy ID Support...");
    const timestamp = Date.now();
    const legacyId = 'e-legacy-test-final';
    const legacyPayload = {
        _id: null,
        _name: `FinalTest_${timestamp}`,
        _phone: `25675${timestamp.toString().slice(-7)}`,
        _category: 'Member',
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _residency: 'FinalCity',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: [legacyId]
    };

    const { data, error } = await supabase.rpc('submit_member_entry', legacyPayload);

    if (error) {
        logData.legacyTest = { status: 'ERROR', message: error.message };
        console.log("Legacy Test: ERROR");
    } else {
        const ignored = data?._meta?.ignored_service_ids || [];
        if (ignored.includes(legacyId)) {
            logData.legacyTest = { status: 'FAIL_IGNORED', ignored };
            console.log("Legacy Test: FAIL (Ignored)");
        } else {
            logData.legacyTest = { status: 'PASS', meta: data?._meta };
            console.log("Legacy Test: PASS (Accepted)");
        }
    }

    fs.writeFileSync('db_verification_log.txt', JSON.stringify(logData, null, 2));
    console.log("Log written to db_verification_log.txt");
};

verifyState();
