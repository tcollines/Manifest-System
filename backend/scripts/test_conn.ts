
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testConnection() {
    console.log('Testing connection to pooler...');
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connection successful!');
        const res = await client.query('SELECT current_database();');
        console.log('Database:', res.rows[0].current_database);
        await client.end();
    } catch (err: any) {
        console.error('❌ Connection failed:', err.message);
    }
}

testConnection();
