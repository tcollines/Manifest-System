const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const url = process.env.DATABASE_URL;
const pwdInfo = url.match(/:([^:@]+)@/);
const pwd = pwdInfo[1];
const direct = `postgres://postgres:${pwd}@db.poazorjmzswectxvakzl.supabase.co:5432/postgres`;

async function runAudit() {
    const client = new Client({
        connectionString: direct,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const constraints = await client.query(`
      SELECT
          tc.table_name, 
          tc.constraint_name, 
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.update_rule,
          rc.delete_rule,
          pg_get_expr(p.conbin, p.conrelid) as check_clause
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          LEFT JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
            AND tc.table_schema = rc.constraint_schema
          LEFT JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          LEFT JOIN pg_constraint p
            ON p.conname = tc.constraint_name
      WHERE tc.table_schema = 'public'
    `);

        const triggers = await client.query(`
      SELECT 
          event_object_table AS table_name,
          trigger_name,
          event_manipulation AS event,
          action_timing AS timing,
          action_statement AS definition
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `);

        const policies = await client.query(`
      SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
      FROM pg_policies
      WHERE schemaname = 'public'
    `);

        const functions = await client.query(`
      SELECT 
          routine_name,
          routine_definition
      FROM information_schema.routines
      WHERE specific_schema = 'public'
    `);

        const results = {
            constraints: constraints.rows,
            triggers: triggers.rows,
            policies: policies.rows,
            functions: functions.rows
        };

        fs.writeFileSync('audit_results.json', JSON.stringify(results, null, 2));
        console.log('Audit results saved to audit_results.json');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

runAudit();
