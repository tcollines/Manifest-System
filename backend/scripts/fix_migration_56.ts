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

function escapeInt(num: number | null | undefined): string {
    if (num === null || num === undefined) return 'NULL';
    return String(num);
}

function escapeBool(val: any): string {
    if (val === null || val === undefined) return 'NULL';
    return val ? 'TRUE' : 'FALSE';
}

function escapeArray(arr: any[] | null | undefined): string {
    if (!arr) return "'{}'";
    // Postgres array format: '{val1,val2}'
    // Clean strings
    const clean = arr.map(s => `"${String(s).replace(/"/g, '\\"')}"`).join(',');
    return `'${clean ? `{${clean}}` : '{}'}'`; // If empty array
}


async function runBatchedMigration() {
    console.log('Starting Batched Migration Fix (Raw SQL Mode)...');

    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore) {
        // 1. Fetch a batch of legacy IDs using standard client (Read is fine usually, or use SQL if read fails too)
        // Read seems to check columns? If select('*') it might fail if legacy_id is unknown? 
        // Let's explicitly select known columns or just ID to be safe, then fetch details via SQL?
        // Actually, let's try standard fetch first. 
        const { data: members, error } = await supabase
            .from('members')
            .select('*')
            .ilike('id', 'm-%')
            .limit(BATCH_SIZE);

        if (error) {
            console.error('Error fetching batch:', error);
            // If read fails due to cache, we must use SQL for read too.
            // Falling back to SQL read would be safer.
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
                // Step 1: Insert WITHOUT legacy_id first (to see if column is the blocker)
                // We use raw SQL to insert.
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
                    console.error(`SQL Insert Failed for ${oldId}:`, JSON.stringify(insertErr, null, 2));
                    continue;
                }

                // Step 1b: Update legacy_id
                const sqlUpdateLegacy = `UPDATE members SET legacy_id = '${oldId}' WHERE id = '${newId}';`;
                const { error: legacyErr } = await supabase.rpc('exec_sql', { sql_query: sqlUpdateLegacy });
                if (legacyErr) {
                    console.error(`SQL Update Legacy Failed for ${oldId}:`, JSON.stringify(legacyErr, null, 2));
                    // Don't abort, we have the member, just missing legacy link. We can fix later if needed, but critical is FKs.
                }

                // Step 2: Update Children
                const sqlUpdate = `UPDATE service_attendance SET member_id = '${newId}' WHERE member_id = '${oldId}';`;
                const { error: updateErr } = await supabase.rpc('exec_sql', { sql_query: sqlUpdate });
                if (updateErr) {
                    console.error(`SQL Update Children Failed for ${oldId}:`, JSON.stringify(updateErr, null, 2));
                    // Try cleanup
                    await supabase.rpc('exec_sql', { sql_query: `DELETE FROM members WHERE id = '${newId}';` });
                    continue;
                }

                // Step 3: Delete Old
                const sqlDelete = `DELETE FROM members WHERE id = '${oldId}';`;
                const { error: deleteErr } = await supabase.rpc('exec_sql', { sql_query: sqlDelete });
                if (deleteErr) {
                    console.error(`SQL Delete Failed for ${oldId}:`, JSON.stringify(deleteErr, null, 2));
                }

            } catch (e: any) {
                console.error(`Exception processing ${oldId}:`, e.message || e);
            }
        }

        totalProcessed += members.length;
        console.log(`Total processed: ${totalProcessed}`);

        // Pause
        await new Promise(r => setTimeout(r, 100));
    }

    console.log('Batched Migration (SQL Mode) Complete.');
}

runBatchedMigration();
