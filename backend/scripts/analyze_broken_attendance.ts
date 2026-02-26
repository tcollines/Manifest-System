
import { supabase } from '../src/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function analyze() {
    console.log('Starting analysis of service_attendance integrity...');

    const { count: totalRows, error: countError } = await supabase
        .from('service_attendance')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting rows:', countError);
        return;
    }

    console.log(`Total attendance rows: ${totalRows}`);

    console.log('Fetching all service_attendance records to check integrity...');

    let allAttendance = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        // Fetch only necessary columns
        const { data, error } = await supabase
            .from('service_attendance')
            .select('id, member_id, service_id')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching attendance:', error);
            break;
        }

        if (!data || data.length === 0) break;

        allAttendance.push(...data);
        page++;
        if (page > 1000) break; // Safety break
    }

    console.log(`Scanned ${allAttendance.length} attendance records.`);

    // Categorize locally first
    let legacyIds = new Set();
    let nullIds = 0;
    let invalidFormatIds = new Set();
    let validUuidFormatIds = new Set();

    for (const row of allAttendance) {
        const mid = row.member_id;
        if (!mid) {
            nullIds++;
        } else if (String(mid).toLowerCase().startsWith('m-')) {
            legacyIds.add(mid);
        } else if (!UUID_REGEX.test(mid)) {
            invalidFormatIds.add(mid);
        } else {
            validUuidFormatIds.add(mid);
        }
    }

    console.log(`Found ${validUuidFormatIds.size} unique valid-format UUIDs to check.`);

    // Check valid UUIDs against members table
    const validUuidsToCheck = Array.from(validUuidFormatIds);
    const existingMemberIds = new Set();
    const batchSize = 1000;

    for (let i = 0; i < validUuidsToCheck.length; i += batchSize) {
        const batch = validUuidsToCheck.slice(i, i + batchSize);
        if (batch.length === 0) continue;

        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('id')
            .in('id', batch);

        if (membersError) {
            console.error('Error fetching members:', membersError);
            continue;
        }

        members.forEach(m => existingMemberIds.add(m.id));
    }

    // Now final tally
    let brokenCount = 0;
    let brokenLegacy = 0;
    let brokenNull = 0;
    let brokenInvalidFormat = 0;
    let brokenMissingUuid = 0;

    const sampleRows = [];

    // Calculate unique broken IDs
    const uniqueBroken = new Set();
    const uniqueMissingUuid = new Set();

    for (const row of allAttendance) {
        const mid = row.member_id;
        let isBroken = false;
        let type = '';

        if (!mid) {
            isBroken = true;
            type = 'NULL';
            brokenNull++;
        } else if (String(mid).toLowerCase().startsWith('m-')) {
            isBroken = true;
            type = 'LEGACY';
            brokenLegacy++;
        } else if (!UUID_REGEX.test(mid)) {
            isBroken = true;
            type = 'INVALID_FORMAT';
            brokenInvalidFormat++;
        } else if (!existingMemberIds.has(mid)) {
            isBroken = true;
            type = 'MISSING_UUID';
            brokenMissingUuid++;
            uniqueMissingUuid.add(mid);
        }

        if (isBroken) {
            brokenCount++;
            uniqueBroken.add(mid);
            if (sampleRows.length < 20) {
                sampleRows.push({ ...row, type });
            }
        }
    }

    console.log('\nFinal Breakdown:');
    console.log('---------------------------------------------------');
    console.log(`Total Rows Scanned: ${allAttendance.length}`);
    console.log(`Total Broken Rows: ${brokenCount}`);
    console.log(`Unique Broken IDs: ${uniqueBroken.size}`);
    console.log(` - Legacy IDs (m-*): ${brokenLegacy}`);
    console.log(` - NULLs: ${brokenNull}`);
    console.log(` - Invalid Format (not UUID/Legacy): ${brokenInvalidFormat}`);
    console.log(` - Missing UUIDs (Zombie Refs): ${brokenMissingUuid} (Unique: ${uniqueMissingUuid.size})`);
    console.log('---------------------------------------------------');
    console.log('Sample Broken Rows (First 20):');
    console.log(JSON.stringify(sampleRows, null, 2));

    const report = {
        totalRows: allAttendance.length,
        brokenCount,
        uniqueBrokenIDs: uniqueBroken.size,
        uniqueMissingUUIDs: uniqueMissingUuid.size,
        breakdown: {
            legacy: brokenLegacy,
            nulls: brokenNull,
            invalidFormat: brokenInvalidFormat,
            missingUuid: brokenMissingUuid
        },
        samples: sampleRows
    };

    const fs = require('fs');
    fs.writeFileSync('analysis_report.json', JSON.stringify(report, null, 2));
    console.log('Report saved to analysis_report.json');
}

analyze().catch(console.error);
