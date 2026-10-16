import { config as loadEnv } from 'dotenv';
import { resolve as resolveEnvPath } from 'path';
loadEnv({ path: resolveEnvPath(__dirname, '../.env') });

import { Client } from 'pg';

const PWD = process.env.SUPABASE_DB_PASSWORD;
const REF = 'poazorjmzswectxvakzl';

const PERMUTATIONS = [
    { name: 'Pooled-5432-RefUser', host: 'aws-0-us-east-1.pooler.supabase.com', port: 5432, user: `postgres.${REF}`, useOptions: false },
    { name: 'Pooled-5432-RefUser-Opt', host: 'aws-0-us-east-1.pooler.supabase.com', port: 5432, user: `postgres.${REF}`, useOptions: true },
    { name: 'Pooled-6543-RefUser', host: 'aws-0-us-east-1.pooler.supabase.com', port: 6543, user: `postgres.${REF}`, useOptions: false },
    { name: 'Direct-5432-BaseUser', host: `db.${REF}.supabase.co`, port: 5432, user: 'postgres', useOptions: false }
];

async function probe() {
    for (const p of PERMUTATIONS) {
        console.log(`\n--- Probing: ${p.name} ---`);
        const config: any = {
            host: p.host,
            port: p.port,
            user: p.user,
            password: PWD,
            database: 'postgres',
            ssl: { rejectUnauthorized: false }
        };
        if (p.useOptions) config.options = `-c project=${REF}`;

        const client = new Client(config);
        try {
            await client.connect();
            console.log(`✅ SUCCESS: ${p.name}`);
            await client.end();
            process.exit(0);
        } catch (err: any) {
            console.log(`❌ FAILED: ${p.name}`);
            console.log(`   Error: ${err.message}`);
        } finally {
            try { await client.end(); } catch (e) { }
        }
    }
}

probe().catch(console.error);
