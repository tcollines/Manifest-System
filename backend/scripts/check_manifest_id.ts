import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const base = process.env.DATABASE_URL || "";

// Bulletproof fallback loop from apply_rls_fix.js
const urls = [
    base,
    base.replace('%3D', '='),
    base.replace('6543', '5432'),
    base.replace('6543', '5432').replace('%3D', '='),
    "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=-c%20project=poazorjmzswectxvakzl",
    "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:5432/postgres?options=-c%20project=poazorjmzswectxvakzl"
];

async function run() {
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`\nTesting connection ${i + 1}...`);

        const client = new Client({
            connectionString: url,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            console.log("✅ Connected! Executing DDL...");

            await client.query(`
                -- 1. Add manifest_id to departments
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='departments' AND column_name='manifest_id') THEN
                        ALTER TABLE public.departments ADD COLUMN manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;
                        CREATE INDEX idx_departments_manifest_id ON public.departments(manifest_id);
                    END IF;
                END $$;

                -- 2. Add manifest_id to healing_testimonies
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='healing_testimonies' AND column_name='manifest_id') THEN
                        ALTER TABLE public.healing_testimonies ADD COLUMN manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;
                        CREATE INDEX idx_healing_testimonies_manifest_id ON public.healing_testimonies(manifest_id);
                    END IF;
                END $$;

                -- 3. Add manifest_id to requisition_items
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='requisition_items' AND column_name='manifest_id') THEN
                        ALTER TABLE public.requisition_items ADD COLUMN manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;
                        CREATE INDEX idx_requisition_items_manifest_id ON public.requisition_items(manifest_id);
                    END IF;
                END $$;

                -- 4. Add manifest_id to training_requests
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='training_requests' AND column_name='manifest_id') THEN
                        ALTER TABLE public.training_requests ADD COLUMN manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;
                        CREATE INDEX idx_training_requests_manifest_id ON public.training_requests(manifest_id);
                    END IF;
                END $$;

                -- 5. Add manifest_id to vehicle_attendance
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vehicle_attendance' AND column_name='manifest_id') THEN
                        ALTER TABLE public.vehicle_attendance ADD COLUMN manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE;
                        CREATE INDEX idx_vehicle_attendance_manifest_id ON public.vehicle_attendance(manifest_id);
                    END IF;
                END $$;
            `);

            console.log("✅ DDL Applied! Querying schema columns...");
            const { rows } = await client.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('departments', 'healing_testimonies', 'requisition_items', 'training_requests', 'vehicle_attendance') AND column_name = 'manifest_id'`);

            fs.writeFileSync('db_test_result.txt', JSON.stringify(rows, null, 2));
            console.log("✅ Schema mapping logged. Exiting.");

            await client.end();
            return; // Exit on first success
        } catch (e: any) {
            console.log(`❌ Failed: ${e.message}`);
        } finally {
            try { await client.end(); } catch (e) { }
        }
    }

    fs.writeFileSync('db_test_result.txt', "ALL CONN ATTEMPTS FAILED.");
}

run();
