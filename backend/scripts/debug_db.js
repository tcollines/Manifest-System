
const { Client } = require('pg');
require('dotenv').config();

console.log("DB URL Length:", process.env.DATABASE_URL ? process.env.DATABASE_URL.length : "MISSING");
if (process.env.DATABASE_URL) {
    console.log("DB URL Start:", process.env.DATABASE_URL.substring(0, 15) + "...");
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
});

client.connect()
    .then(() => {
        console.log("Connected!");
        return client.query('SELECT 1 as val');
    })
    .then(res => {
        console.log("Query Result:", res.rows[0]);
        client.end();
    })
    .catch(err => {
        console.error("Connection Error:", err.message);
        console.error("Code:", err.code);
        client.end();
    });
