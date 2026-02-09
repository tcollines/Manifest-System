
import { supabase } from '../src/supabase';

async function auditSchema() {
    console.log('--- Starting UUID Compliance Audit ---');

    // 1. Verify Primary Keys are UUIDs
    const coreTables = ['members', 'users', 'departments', 'events', 'services', 'service_attendance', 'souls'];

    console.log('\n1. Checking Primary Keys (Expect: uuid)');
    for (const table of coreTables) {
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: `
                SELECT kcu.column_name, c.data_type
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.columns c
                    ON c.table_name = kcu.table_name
                    AND c.column_name = kcu.column_name
                WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_name = '${table}';
            `
        });

        if (error) {
            console.error(`Error checking ${table}:`, error);
        } else {
            const pk = data[0];
            const status = pk && pk.data_type === 'uuid' ? '✅' : '❌';
            console.log(`${status} ${table}: ${pk ? pk.data_type : 'No PK found'}`);
        }
    }

    // 2. Scan for Non-UUID Foreign Keys (Heuristic: columns ending in _id)
    console.log('\n2. Scanning for Non-UUID FK Candidates (columns ending in _id)');
    const { data: fkCandidates, error: fkError } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_name IN ('${coreTables.join("','")}')
            AND column_name LIKE '%_id'
            AND table_schema = 'public';
        `
    });

    if (fkError) {
        console.error('Error scanning columns:', fkError);
    } else {
        fkCandidates.forEach((col: any) => {
            if (col.data_type !== 'uuid') {
                console.log(`⚠️  Potential Issue: ${col.table_name}.${col.column_name} is ${col.data_type}`);
            }
        });
        const validCount = fkCandidates.filter((c: any) => c.data_type === 'uuid').length;
        console.log(`Verified ${validCount}/${fkCandidates.length} _id columns are UUID.`);
    }

    // 3. Referential Integrity Check (Orphan Scan)
    console.log('\n3. Referential Integrity Sample (Orphan Check)');

    // Check Service Attendance -> Members
    const { count: brokenAttendance, error: attError } = await supabase
        .from('service_attendance')
        .select('*', { count: 'exact', head: true })
        .not('member_id', 'is', null)
        .filter('member_id', 'not.in', (await supabase.from('members').select('id').then(res => `(${res.data?.map(m => `"${m.id}"`).join(',')})`))); // This is tricky in JS, easier to just run the find_orphans logic or use a focused query if RLS permits.

    // Better approach: Count rows where member_id NOT IN (SELECT id FROM members) using RPC or just trusting the previous repair verification
    // creating a quick dynamic check
    const checkOrphans = async (table: string, fk: string, parentTable: string) => {
        // Fetch all FKs
        const { data: children } = await supabase.from(table).select(fk);
        if (!children) return;
        const childIds = children.map((c: any) => c[fk]).filter(id => id);

        // Fetch valid parents
        const { data: parents } = await supabase.from(parentTable).select('id');
        const parentIds = new Set(parents?.map((p: any) => p.id));

        const orphans = childIds.filter(id => !parentIds.has(id));
        if (orphans.length === 0) {
            console.log(`✅ ${table}.${fk} -> ${parentTable}: 0 Orphans`);
        } else {
            console.log(`❌ ${table}.${fk} -> ${parentTable}: ${orphans.length} Orphans Found!`);
        }
    };

    await checkOrphans('service_attendance', 'member_id', 'members');
    // await checkOrphans('users', 'department_id', 'departments'); // users might be diverse, checking commonly used ones
}

auditSchema().catch(console.error);
