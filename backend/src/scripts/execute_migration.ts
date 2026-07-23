import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const regions = [
    'aws-0-us-east-1',
    'aws-0-us-west-1',
    'aws-0-eu-central-1',
    'aws-0-eu-west-1',
    'aws-0-ap-southeast-1',
    'aws-0-ap-northeast-1',
    'aws-0-sa-east-1'
];

const run = async () => {
    let client: Client | null = null;
    let connected = false;

    for (const region of regions) {
        for (const port of [6543, 5432]) {
            const host = `${region}.pooler.supabase.com`;
            const user = 'postgres.poazorjmzswectxvakzl';
            console.log(`Testing host ${host}:${port}...`);
            client = new Client({
                host,
                port,
                user,
                password: 'ujrRGd5IZIKOE9Oj',
                database: 'postgres',
                ssl: { rejectUnauthorized: false }
            });
            try {
                await client.connect();
                console.log(`✅ Connected successfully to ${host}:${port}!`);
                connected = true;
                break;
            } catch (err: any) {
                try { await client.end(); } catch (e) {}
                client = null;
            }
        }
        if (connected) break;
    }

    if (!connected || !client) {
        console.error('❌ Could not connect to Supabase database.');
        process.exit(1);
    }

    try {
        const sqlPath = path.resolve(__dirname, '../../migrations/20_realtime_broadcast_triggers.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing migration 20 from: ${sqlPath}`);
        await client.query(sql);
        console.log('✅ Migration 20 executed successfully.');

        const triggerCheck = await client.query(`
            SELECT trigger_name, event_manipulation, event_object_table
            FROM information_schema.triggers
            WHERE trigger_name IN ('trg_broadcast_service_attendance', 'trg_broadcast_souls', 'trg_broadcast_next_gen_souls');
        `);
        console.log('Verified Triggers:');
        console.table(triggerCheck.rows);

        const policyCheck = await client.query(`
            SELECT policyname, tablename, cmd 
            FROM pg_policies 
            WHERE policyname = 'Tenant private broadcast select policy';
        `);
        console.log('Verified RLS Policy:');
        console.table(policyCheck.rows);

    } catch (err) {
        console.error('❌ Migration 20 execution failed:', err);
    } finally {
        await client.end();
    }
};

run();
