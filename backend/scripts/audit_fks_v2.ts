import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function auditForeignKeys(tableName: string) {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = '${tableName}';
    `
    });

    if (error) {
        console.error('Error fetching FKs:', error);
        return;
    }

    const outputPath = path.resolve(__dirname, 'audit_results_v2.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`Audit written to ${outputPath}`);
}

auditForeignKeys('members');
