const { Client } = require('pg');
require('dotenv').config();

async function inspectSchema() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        
        console.log("--- Manifests Table ---");
        let res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'manifests';
        `);
        console.table(res.rows);

        console.log("--- Users / Profiles Table ---");
        res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('users', 'profiles', 'members')
            ORDER BY table_name, ordinal_position;
        `);
        console.table(res.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

inspectSchema();
