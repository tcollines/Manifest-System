
const { Client } = require('pg');
const dns = require('dns');

async function test() {
    const host = 'db.poazorjmzswectxvakzl.supabase.co';

    console.log(`Resolving ${host}...`);
    dns.lookup(host, (err, address, family) => {
        if (err) console.error('DNS Lookup Failed:', err.message);
        else console.log(`Resolved to: ${address} (v${family})`);
    });

    const config = {
        user: 'postgres',
        password: 'Li9ggyOczGdGPvFy',
        host: host,
        port: 5432,
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    };

    console.log('Testing hardcoded Direct connection...');
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
