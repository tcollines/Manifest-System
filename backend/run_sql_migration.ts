import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function run() {
    const sqlPath = path.join(__dirname, '../frontend/database/17_add_event_scoping.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log("Running migration via /api/admin/sql...");
        const response = await axios.post('http://localhost:5000/api/admin/sql', {
            query: sql
        });

        console.log("Response:", response.data);
        if (response.data.success) {
            console.log("Migration Successful!");
        } else {
            console.error("Migration Failed:", response.data);
        }
    } catch (e: any) {
        console.error("Error:", e.response?.data || e.message);
    }
}

run();
