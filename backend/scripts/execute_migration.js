const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
    const migrationFile = process.argv[2];
    if (!migrationFile) {
        console.error("Please provide a migration file path as the first argument.");
        process.exit(1);
    }

    const filePath = path.isAbsolute(migrationFile) ? migrationFile : path.resolve(process.cwd(), migrationFile);

    if (!fs.existsSync(filePath)) {
        console.error(`Migration file not found: ${filePath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Executing SQL from ${filePath}:\n`, sql);

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error("RPC Error (exec_sql):", error);
        console.log("Attempting fallback via PG Client...");

        try {
            const { Client } = require('pg');
            const client = new Client({
                connectionString: process.env.DATABASE_URL,
            });
            await client.connect();
            await client.query(sql);
            await client.end();
            console.log("Migration executed via PG Client successfully!");
        } catch (pgError) {
            console.error("PG Client Error:", pgError);
            process.exit(1);
        }
    } else {
        console.log("Migration executed via RPC successfully!");
    }
}

runMigration();
