
import { supabase } from '../src/supabase';
import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(__dirname, 'audit_report.txt');

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function audit() {
    fs.writeFileSync(LOG_FILE, '');
    log('--- COMPREHENSIVE UUID COMPLIANCE AUDIT ---\n');

    // 1. UUID Purity (PKs)
    log('1. Primary Key Type Verification');
    const coreTables = ['members', 'users', 'departments', 'events', 'services', 'service_attendance', 'souls', 'requisitions'];

    for (const table of coreTables) {
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: `
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}' AND column_name = 'id'
            `
        });

        if (error) {
            log(`❌ ${table}: Error checking id type - ${error.message}`);
        } else {
            const type = data?.[0]?.data_type;
            if (type === 'uuid') log(`✅ ${table}: id is UUID`);
            else log(`❌ ${table}: id is ${type} (EXPECTED UUID)`);
        }
    }

    // 2. Foreign Key Checks & Referential Integrity
    log('\n2. Referential Integrity Checks');

    const checkRef = async (childTable: string, fkCol: string, parentTable: string, parentCol: string = 'id') => {
        log(`Checking ${childTable}.${fkCol} -> ${parentTable}.${parentCol}...`);

        // Fetch child FKs
        // Using pages to avoid memory limits if huge, but valid datasets here seem small enough < 100k
        let childIds = new Set<string>();
        let page = 0;
        while (true) {
            const { data, error } = await supabase.from(childTable).select(fkCol).range(page * 1000, (page + 1) * 1000 - 1);
            if (error || !data || data.length === 0) break;
            data.forEach((r: any) => {
                if (r[fkCol]) childIds.add(r[fkCol]);
            });
            page++;
            if (data.length < 1000) break;
        }

        // Fetch parent IDs
        let parentIds = new Set<string>();
        page = 0;
        while (true) {
            const { data, error } = await supabase.from(parentTable).select(parentCol).range(page * 1000, (page + 1) * 1000 - 1);
            if (error || !data || data.length === 0) break;
            data.forEach((r: any) => parentIds.add(r.id));
            page++;
            if (data.length < 1000) break;
        }

        const orphans = Array.from(childIds).filter(id => !parentIds.has(id));

        if (orphans.length === 0) {
            log(`✅ ${childTable}.${fkCol} -> ${parentTable}: 0 Orphans`);
        } else {
            log(`❌ ${childTable}.${fkCol} -> ${parentTable}: ${orphans.length} Orphans Found!`);
            log(`   Examples: ${orphans.slice(0, 5).join(', ')}`);
            // Save bad IDs
            fs.writeFileSync(path.join(__dirname, `${childTable}_orphans.json`), JSON.stringify(orphans, null, 2));
        }
    };

    await checkRef('service_attendance', 'member_id', 'members');
    await checkRef('souls', 'member_id', 'members'); // Assuming member_id links to members who won the soul? Or is it linked to 'users'?
    // Souls table usually has a 'captured_by' or similar? 
    // Checking schema for souls...

    // Check Users -> Departments
    await checkRef('users', 'department_id', 'departments');

    // 3. Scan for Legacy ID Columns
    log('\n3. Legacy ID Column Scan');
    const { data: cols } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE column_name LIKE '%legacy%' OR column_name LIKE '%old%' 
            AND table_schema = 'public'
        `
    });

    if (cols) {
        log(`Found potential legacy columns:`);
        cols.forEach((c: any) => log(`ℹ️  ${c.table_name}.${c.column_name}`));
    }

    log('\n--- End of Audit ---');
}

audit().catch(err => {
    log(`CRITICAL ERROR: ${err.message}`);
});
