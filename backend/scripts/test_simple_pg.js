
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
    // Port 6543 (Transaction mode) often handles the project ID better in the username
    const connectionString = process.env.DATABASE_URL;
    console.log("Testing:", connectionString.split('@')[1]);

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ SUCCESS!");
        const res = await client.query("SELECT current_user, current_database()");
        console.log("Result:", res.rows[0]);
    } catch (err) {
        console.error("❌ Failed:", err.message);
    } finally {
        await client.end();
    }
}

test();
