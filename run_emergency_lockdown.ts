import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const sqlPath = path.join(__dirname, 'frontend/database/29_emergency_security_lockdown.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log("Running lockdown migration via /api/admin/sql using fetch...");
        const response = await fetch('http://localhost:5000/api/admin/sql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sql })
        });

        const data = await response.json();

        if (response.ok && data.success !== false) {
            console.log("✅ Lockdown Migration Successful!");
            console.log("Response:", data);
        } else {
            console.error("❌ Migration Failed:", data);
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

run();
