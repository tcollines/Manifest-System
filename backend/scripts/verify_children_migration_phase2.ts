import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verifyMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🔌 Connected to DB for Verification");

        // 1. Children Stats
        const childStats = await client.query(`
            SELECT 
                COUNT(*) as total_rows,
                COUNT(id_uuid) as filled_uuid,
                COUNT(legacy_id) as filled_legacy,
                COUNT(*) FILTER (WHERE id_uuid IS NULL) as null_uuid
            FROM children;
        `);

        // 2. Incidents Stats
        const incidentStats = await client.query(`
            SELECT 
                COUNT(*) as total_rows,
                COUNT(child_id_uuid) as filled_uuid,
                COUNT(*) FILTER (WHERE child_id IS NOT NULL AND child_id_uuid IS NULL) as orphan_or_failed
            FROM incidents;
        `);

        console.log("\n📊 Children Table Verification:");
        console.table(childStats.rows);

        console.log("\n📊 Incidents Table Verification:");
        console.table(incidentStats.rows);

        const childrenTotal = parseInt(childStats.rows[0].total_rows);
        const childrenFilled = parseInt(childStats.rows[0].filled_uuid);

        if (childrenTotal > 0 && childrenTotal === childrenFilled) {
            console.log("✅ Children Backfill: 100% Success");
        } else if (childrenTotal === 0) {
            console.log("⚠️ Children Table is empty (0 rows).");
        } else {
            console.error("❌ Children Backfill Failed or Incomplete");
        }

    } catch (err) {
        console.error("❌ Verification Error:", err);
    } finally {
        await client.end();
    }
}

verifyMigration();
