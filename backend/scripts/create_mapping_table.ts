import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function createTable() {
    console.log('Creating legacy_id_mapping table...');
    const createTableSql = `
    CREATE TABLE IF NOT EXISTS legacy_id_mapping (
        legacy_id TEXT PRIMARY KEY,
        new_id UUID NOT NULL, -- references members(id) removed to avoid FK cache issues
        migrated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
    const { error: tableErr } = await supabase.rpc('exec_sql', { sql_query: createTableSql });
    if (tableErr) {
        console.error('Failed to create mapping table:', tableErr);
    } else {
        console.log('Table Created OK');
    }
}

createTable();
