
const { Client } = require('pg');

async function test() {
    const config = {
        user: 'postgres.poazorjmzswectxvakzl',
        password: 'Li9ggyOczGdGPvFy',
        host: 'aws-0-us-east-1.pooler.supabase.com',
        port: 5432,
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    };

    console.log('Testing hardcoded Pooled connection...');
    const client = new Client(config);
    try {
        await client.connect();
        console.log('✅ SUCCESS!');
        await client.end();
    } catch (err) {
        console.error('❌ FAILURE:', err.message);
    }
}

test();
