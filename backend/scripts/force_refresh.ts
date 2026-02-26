import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function forceRefresh() {
    console.log('Forcing Schema Cache Refresh via DDL...');

    // 1. Drop Column
    console.log('Dropping legacy_id...');
    const { error: dropErr } = await supabase.rpc('exec_sql', {
        sql_query: "ALTER TABLE members DROP COLUMN IF EXISTS legacy_id;"
    });
    if (dropErr) console.error('Drop Failed:', dropErr);
    else console.log('Drop OK');

    // Verify access (should work now as column is gone)
    const { error: accessErr } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT count(*) FROM members"
    });
    if (accessErr) console.error('Access Check (After Drop) Failed:', accessErr);
    else console.log('Access Check (After Drop) OK');

    // 2. Add Column Back
    console.log('Adding legacy_id back...');
    const { error: addErr } = await supabase.rpc('exec_sql', {
        sql_query: "ALTER TABLE members ADD COLUMN legacy_id TEXT; CREATE UNIQUE INDEX IF NOT EXISTS idx_members_legacy_id ON members(legacy_id) WHERE legacy_id IS NOT NULL;"
    });
    if (addErr) console.error('Add Failed:', addErr);
    else console.log('Add OK');

    // 3. Verify access again
    console.log('Waiting 5s for cache...');
    await new Promise(r => setTimeout(r, 5000));

    const { error: accessErr2 } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT count(*) FROM members"
    });
    if (accessErr2) console.error('Access Check (After Add) Failed:', accessErr2);
    else console.log('Access Check (After Add) OK');

    // 4. Test Insert (Lightweight)
    const { error: insertErr } = await supabase.rpc('exec_sql', {
        sql_query: "INSERT INTO members (id, name, created_at) VALUES ('00000000-0000-0000-0000-000000000005', 'CACHE_TEST', NOW())"
    });
    if (insertErr) console.error('Insert Test Failed:', insertErr);
    else {
        console.log('Insert Test OK');
        await supabase.rpc('exec_sql', { sql_query: "DELETE FROM members WHERE id = '00000000-0000-0000-0000-000000000005'" });
    }

}

forceRefresh();
