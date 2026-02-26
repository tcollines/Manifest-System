
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Try explicit path
const envPath = path.resolve(__dirname, '../.env');
console.log("Loading env from:", envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("Dotenv Error:", result.error.message);
}

console.log("DATABASE_URL defined:", !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
    console.log("EXIT: No DB URL");
    process.exit(1);
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

client.connect()
    .then(() => {
        console.log("CONNECTED SUCCESSFULLY");
        return client.query('SELECT 1 as val');
    })
    .then((res) => {
        console.log("QUERY SUCCESS:", res.rows[0]);
        client.end();
    })
    .catch(err => {
        console.error("CONNECTION ERROR JSON:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
        client.end();
    });
