const { Client } = require('pg');
const fs = require('fs');

async function run() {
    const dbUrl = "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        options: "project=poazorjmzswectxvakzl"
    });
    
    try {
        await client.connect();
        console.log("Connected to database via pg...");
        
        const script = fs.readFileSync('d:\\Manifest System\\frontend\\database\\32_add_business_documents.sql', 'utf8');
        console.log("Executing 32_add_business_documents.sql...");
        
        await client.query(script);
        console.log("✅ Business Documents table created successfully!");
    } catch (err) {
        console.error("❌ Error executing SQL:", err);
    } finally {
        await client.end();
    }
}

run();
