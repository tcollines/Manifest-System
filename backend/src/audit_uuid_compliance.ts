
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'd:/Manifest System/backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const outputLog = 'd:/Manifest System/backend/gap_audit_log.txt';
let logBuffer = "--- UUID COMPLIANCE AUDIT ---\n";

const isUUID = (value: any) => {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
};

const checkTable = async (tableName: string, pkColumn: string = 'id', checkColumns: string[] = []) => {
    logBuffer += `\nTABLE: ${tableName}\n`;

    // Check PK type by sampling
    const { data: sample, error } = await supabase.from(tableName).select('*').limit(100);

    if (error) {
        logBuffer += `  ERROR: ${error.message}\n`;
        return;
    }

    if (sample.length === 0) {
        logBuffer += `  [INFO] Table is empty.\n`;
        return;
    }

    // PK Analysis
    let nonUuidPkCount = 0;
    let magicIds: string[] = [];

    for (const row of sample) {
        const val = row[pkColumn];
        if (!isUUID(val)) {
            nonUuidPkCount++;
            if (typeof val === 'string' && val.length < 20) magicIds.push(val);
        }
    }

    if (nonUuidPkCount > 0) {
        logBuffer += `  ❌ PK '${pkColumn}' is NOT UUID-only. Found ${nonUuidPkCount}/100 non-UUIDs.\n`;
        logBuffer += `  ⚠️ Sample Non-UUIDs: ${[...new Set(magicIds)].slice(0, 5).join(', ')}\n`;
    } else {
        logBuffer += `  ✅ PK '${pkColumn}' appears to be UUID.\n`;
    }

    // Check specific columns
    for (const col of checkColumns) {
        let invalidCount = 0;
        let invalidSamples: string[] = [];

        for (const row of sample) {
            const val = row[col];
            if (val === null || val === undefined) continue;

            // If strictly expecting UUID
            if (!isUUID(val)) {
                // If it's an array, check elements
                if (Array.isArray(val)) {
                    const nonUuidElements = val.filter(v => !isUUID(v));
                    if (nonUuidElements.length > 0) {
                        invalidCount++;
                        invalidSamples.push(`[${nonUuidElements.slice(0, 2).join(',')},...]`);
                    }
                } else {
                    invalidCount++;
                    invalidSamples.push(String(val));
                }
            }
        }

        if (invalidCount > 0) {
            logBuffer += `  ❌ Column '${col}' contains non-UUIDs. Found ${invalidCount}/100 samples.\n`;
            logBuffer += `  ⚠️ Samples: ${[...new Set(invalidSamples)].slice(0, 5).join(', ')}\n`;
        } else {
            logBuffer += `  ✅ Column '${col}' appears compliant (or empty).\n`;
        }
    }
}

const audit = async () => {
    // 1. Departments (Static vs DB)
    // There is no 'departments' table in Supabase usually if it's enum-like, but user mentioned it.
    // Let's check 'requisitions.department_id' and see what values it holds (FK side).

    logBuffer += "\n--- RELATIONSHIP AUDIT ---\n";

    // Check Requisitions -> Departments
    const { data: reqs } = await supabase.from('requisitions').select('department_id').limit(50);
    const uniqueDeptIds = [...new Set(reqs?.map(r => r.department_id))];
    logBuffer += `Requisitions link to Department IDs: ${uniqueDeptIds.join(', ')}\n`;
    const nonUuidDepts = uniqueDeptIds.filter(id => !isUUID(id));
    if (nonUuidDepts.length > 0) logBuffer += `  ❌ Found Magic Department IDs: ${nonUuidDepts.join(', ')}\n`;

    // Check Users -> Departments
    const { data: users } = await supabase.from('users').select('department_id').limit(50);
    const uniqueUserDepts = [...new Set(users?.map(u => u.department_id))];
    logBuffer += `Users link to Department IDs: ${uniqueUserDepts.join(', ')}\n`;

    // 2. Members -> Services (Array)
    await checkTable('members', 'id', ['attended_service_ids']);

    // 3. Ministry Events -> PK
    await checkTable('ministry_events', 'id');

    // 4. Requisitions -> PK
    await checkTable('requisitions', 'id');

    // 5. Souls -> Source ID (Polymorphic)
    await checkTable('souls', 'id', ['source_id']);

    // 6. Healing Reports -> ID
    await checkTable('healing_reports', 'id');

    fs.writeFileSync(outputLog, logBuffer);
    console.log("Audit complete. Log written to " + outputLog);
};

audit();
