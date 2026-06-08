const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const connectionString = "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl";

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to database successfully.");

        // 1. Update the RPC
        const sqlPath = './src/database/migrations/60_requisition_generator_rpc.sql';
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log("Applying RPC update...");
        await client.query(sql);
        console.log("RPC updated successfully.");

        // 2. Fix the existing stuck requisitions
        // Find requisitions of type 'WORKPLAN' where the total_amount does not reflect dept_contribution
        // Wait, it's safer to just update any pending requisition whose total_amount is wrong.
        console.log("Fixing existing requisitions...");
        
        const res = await client.query(`
            UPDATE public.requisitions r
            SET total_amount = GREATEST(0, COALESCE(wi.approved_amount, wi.amount) - COALESCE(wi.dept_contribution, 0))
            FROM public.workplan_items wi
            WHERE r.workplan_item_id = wi.id
              AND r.type = 'WORKPLAN'
              AND r.total_amount != GREATEST(0, COALESCE(wi.approved_amount, wi.amount) - COALESCE(wi.dept_contribution, 0))
              AND r.status IN ('DRAFT', 'PENDING', 'TL_APPROVAL')
            RETURNING r.id;
        `);
        console.log(`Updated ${res.rowCount} requisitions.`);
        
        const resItems = await client.query(`
            UPDATE public.requisition_items ri
            SET total_cost = GREATEST(0, COALESCE(wi.approved_amount, wi.amount) - COALESCE(wi.dept_contribution, 0)),
                unit_cost = CASE 
                    WHEN COALESCE(wi.approved_quantity, wi.quantity) > 0 
                    THEN GREATEST(0, COALESCE(wi.approved_amount, wi.amount) - COALESCE(wi.dept_contribution, 0)) / COALESCE(wi.approved_quantity, wi.quantity)
                    ELSE GREATEST(0, COALESCE(wi.approved_amount, wi.amount) - COALESCE(wi.dept_contribution, 0))
                END
            FROM public.requisitions r
            JOIN public.workplan_items wi ON r.workplan_item_id = wi.id
            WHERE ri.requisition_id = r.id
              AND r.type = 'WORKPLAN'
              AND ri.total_cost != GREATEST(0, COALESCE(wi.approved_amount, wi.amount) - COALESCE(wi.dept_contribution, 0))
              AND r.status IN ('DRAFT', 'PENDING', 'TL_APPROVAL')
            RETURNING ri.id;
        `);
        console.log(`Updated ${resItems.rowCount} requisition items.`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
