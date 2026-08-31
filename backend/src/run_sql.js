require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function run() {
    const dbUrl = process.env.DATABASE_URL;
    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log("Connected to database via pg...");
        
        const script = fs.readFileSync('d:\\Manifest System\\frontend\\database\\33_add_variant_codes.sql', 'utf8');
        console.log("Executing 33_add_variant_codes.sql...");
        
        await client.query(script);
        console.log("✅ Migration 33 executed successfully!");
    } catch (err) {
        console.error("❌ Error executing SQL:", err);
    } finally {
        await client.end();
    }
}

run();
