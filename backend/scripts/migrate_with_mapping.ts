import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

const BATCH_SIZE = 50;

function escapeSql(str: string | null | undefined): string {
    if (str === null || str === undefined) return 'NULL';
    return `'${String(str).replace(/'/g, "''")}'`;
}

function escapeArray(arr: any[] | null | undefined): string {
    if (!arr) return "'{}'";
    const clean = arr.map(s => `"${String(s).replace(/"/g, '\\"')}"`).join(',');
    return `'${clean ? `{${clean}}` : '{}'}'`;
}

async function runMappingMigration() {
    console.log('Starting Migration with Legacy ID Mapping Table...');

    // 1. Create Mapping Table
    console.log('Creating legacy_id_mapping table...');
    const createTableSql = `
    CREATE TABLE IF NOT EXISTS legacy_id_mapping (
        legacy_id TEXT PRIMARY KEY,
        new_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        migrated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
    const { error: tableErr } = await supabase.rpc('exec_sql', { sql_query: createTableSql });
    if (tableErr) {
        console.error('Failed to create mapping table:', tableErr);
        process.exit(1);
    }

    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore) {
        // 2. Fetch Batch of Legacy IDs
        const { data: members, error } = await supabase
            .from('members')
            .select('*')
            .ilike('id', 'm-%')
            .limit(BATCH_SIZE);

        if (error) {
            console.error('Error fetching batch:', error);
            break;
        }

        if (!members || members.length === 0) {
            console.log('No more legacy IDs found.');
            hasMore = false;
            break;
        }

        console.log(`Processing batch of ${members.length} members...`);

        for (const m of members) {
            const oldId = m.id;
            const newId = uuidv4();

            try {
                // Step 1: Insert NEW Member (Standard Insert, no legacy_id column involved)
                // We use explicit columns to be safe.
                const sqlInsert = `
            INSERT INTO members (
                id, name, category, phone, status, check_in_time, gender, residency, 
                born_again, joined_date, attended_service_ids, 
                occupation, place_of_work, email, is_phaneroo_member, referral_source,
                created_at
            ) VALUES (
                '${newId}',
                ${escapeSql(m.name)},
                ${escapeSql(m.category)},
                ${escapeSql(m.phone)},
                ${escapeSql(m.status)},
                ${escapeSql(m.check_in_time)},
                ${escapeSql(m.gender)},
                ${escapeSql(m.residency)},
                ${escapeSql(m.born_again)},
                ${escapeSql(m.joined_date)},
                ${escapeArray(m.attended_service_ids)},
                ${escapeSql(m.occupation)},
                ${escapeSql(m.place_of_work)},
                ${escapeSql(m.email)},
                ${escapeSql(m.is_phaneroo_member)},
                ${escapeSql(m.referral_source)},
                ${escapeSql(m.created_at)}
            );
        `;

                const { error: insertErr } = await supabase.rpc('exec_sql', { sql_query: sqlInsert });
                if (insertErr) {
                    console.error(`Insert Failed for ${oldId}:`, JSON.stringify(insertErr, null, 2));
                    continue;
                }

                // Step 2: Insert into Mapping Table
                const sqlMap = `INSERT INTO legacy_id_mapping (legacy_id, new_id) VALUES ('${oldId}', '${newId}') ON CONFLICT (legacy_id) DO NOTHING;`;
                const { error: mapErr } = await supabase.rpc('exec_sql', { sql_query: sqlMap });
                if (mapErr) {
                    console.error(`Mapping Insert Failed for ${oldId}:`, JSON.stringify(mapErr, null, 2));
                    // Should probably rollback new member
                }

                // Step 3: Update Dependencies
                const sqlUpdate = `UPDATE service_attendance SET member_id = '${newId}' WHERE member_id = '${oldId}';`;
                const { error: updateErr } = await supabase.rpc('exec_sql', { sql_query: sqlUpdate });
                if (updateErr) {
                    console.error(`Dependency Update Failed for ${oldId}:`, JSON.stringify(updateErr, null, 2));
                }

                // Step 4: Delete Old Member
                const sqlDelete = `DELETE FROM members WHERE id = '${oldId}';`;
                const { error: deleteErr } = await supabase.rpc('exec_sql', { sql_query: sqlDelete });
                if (deleteErr) {
                    console.error(`Delete Old Failed for ${oldId}:`, JSON.stringify(deleteErr, null, 2));
                }

            } catch (e: any) {
                console.error(`Exception on ${oldId}:`, e.message);
            }
        }

        totalProcessed += members.length;
        console.log(`Total processed: ${totalProcessed}`);

        await new Promise(r => setTimeout(r, 100)); // Pause
    }

    console.log('Mapping Migration Complete.');
}

runMappingMigration();
