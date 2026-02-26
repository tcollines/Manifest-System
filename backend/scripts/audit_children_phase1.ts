
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runAudit() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🔌 Connected to DB");

        // 1. Count & Patterns
        console.log("\n📊 1. Row Count & ID Patterns:");
        const res1 = await client.query(`
            SELECT 
                COUNT(*) as total_children,
                COUNT(CASE WHEN id LIKE 'c-bulk-%' THEN 1 END) as bulk_pattern_count,
                COUNT(CASE WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as uuid_pattern_count,
                COUNT(CASE WHEN id IS NULL THEN 1 END) as null_id_count
            FROM children;
        `);
        console.table(res1.rows);

        // 2. Sample IDs
        console.log("\n🧪 2. Sample IDs (First 5):");
        const res2 = await client.query(`SELECT id FROM children LIMIT 5`);
        console.table(res2.rows);

        // 3. Foreign Keys (Referencing tables)
        console.log("\n🔗 3. Referencing Tables (Foreign Keys):");
        const res3 = await client.query(`
            SELECT 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE ccu.table_name = 'children';
        `);
        if (res3.rows.length === 0) {
            console.log("   (No explicit Foreign Keys found)");
        } else {
            console.table(res3.rows);
        }

        // 4. Implicit Column References
        console.log("\n🕵️ 4. Implicit 'child_id' Columns (Potential relations):");
        const res4 = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE column_name LIKE '%child_id%' 
            AND table_name != 'children'
            AND table_schema = 'public';
        `);
        console.table(res4.rows);

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.end();
    }
}

runAudit();
