import { Client } from 'pg';
import * as fs from 'fs';

const poolerUrl = "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl";

const client = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to 6543 Transaction Pooler!");

        // 1. Departments
        await client.query("ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;");
        await client.query("CREATE INDEX IF NOT EXISTS idx_departments_manifest_id ON public.departments(manifest_id);");

        // 2. Healing Testimonies
        await client.query("ALTER TABLE public.healing_testimonies ADD COLUMN IF NOT EXISTS manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;");
        await client.query("CREATE INDEX IF NOT EXISTS idx_healing_testimonies_manifest_id ON public.healing_testimonies(manifest_id);");

        // 3. Requisition Items
        await client.query("ALTER TABLE public.requisition_items ADD COLUMN IF NOT EXISTS manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;");
        await client.query("CREATE INDEX IF NOT EXISTS idx_requisition_items_manifest_id ON public.requisition_items(manifest_id);");

        // 4. Training Requests
        await client.query("ALTER TABLE public.training_requests ADD COLUMN IF NOT EXISTS manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;");
        await client.query("CREATE INDEX IF NOT EXISTS idx_training_requests_manifest_id ON public.training_requests(manifest_id);");

        // 5. Vehicle Attendance
        await client.query("ALTER TABLE public.vehicle_attendance ADD COLUMN IF NOT EXISTS manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;");
        await client.query("CREATE INDEX IF NOT EXISTS idx_vehicle_attendance_manifest_id ON public.vehicle_attendance(manifest_id);");

        console.log("Migration executed!");

        const { rows } = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('departments', 'healing_testimonies', 'requisition_items', 'training_requests', 'vehicle_attendance') AND column_name = 'manifest_id'");
        fs.writeFileSync('db_test_result.txt', JSON.stringify(rows, null, 2));
        console.table(rows);
    } catch (e: any) {
        console.error("CRITICAL ERROR:");
        console.error(e.message);
        console.error("CODE:", e.code);
        fs.writeFileSync('db_test_result.txt', "FAILED");
    } finally {
        await client.end();
    }
}

run();
