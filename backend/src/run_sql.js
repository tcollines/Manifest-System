const postgres = require('postgres');
const fs = require('fs');

async function run() {
    const dbUrl = "postgresql://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl";
    const sql = postgres(dbUrl, { ssl: 'require' });
    
    try {
        console.log("Connected to database...");
        
        const script = fs.readFileSync('C:\\Users\\Abraham\\.gemini\\antigravity-ide\\brain\\fa21c07c-eeae-4ba6-8bdc-7a2d8c1a65f7\\RLS_Lockdown_Phase4.sql', 'utf8');
        console.log("Executing RLS Lockdown Script...");
        
        await sql.unsafe(script);
        console.log("✅ Phase 4 RLS Lockdown completed successfully!");
    } catch (err) {
        console.error("❌ Error executing SQL:", err);
    } finally {
        await sql.end();
    }
}

run();
