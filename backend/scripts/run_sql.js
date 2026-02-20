const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runSqlFile() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Please specify a SQL file to run (e.g., node scripts/run_sql.js database/script.sql)');
        process.exit(1);
    }

    const fullPath = path.resolve(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`File not found: ${fullPath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log(`Executing SQL from: ${filePath}\n`);

    let connectionString = process.env.DATABASE_URL;

    // If it's a Supabase pooler URL, convert it to a direct connection URL
    if (connectionString.includes('pooler.supabase.com')) {
        const projectIdMatch = connectionString.match(/project%3D([a-z0-9]+)/);
        const passwordMatch = connectionString.match(/:([^:]+)@aws-/);

        if (projectIdMatch && passwordMatch) {
            const projectId = projectIdMatch[1];
            const password = passwordMatch[1];
            connectionString = `postgres://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;
            console.log('Using direct connection URL (bypassing pooler).');
        }
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Execute the full SQL script
        const result = await client.query(sql);
        console.log('✅ SQL Script executed successfully.');

        // If it's an array, multiple statements were run
        if (Array.isArray(result)) {
            console.log(`Executed ${result.length} statements.`);
        } else {
            console.log(`Command: ${result.command}, Row count: ${result.rowCount || 0}`);
        }
    } catch (err) {
        console.error('❌ SQL Execution Error:\n', err.message);
        if (err.position) {
            console.error(`At position: ${err.position}`);
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

runSqlFile();
