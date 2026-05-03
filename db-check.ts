import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if(!connectionString) throw new Error("No URL");
  const client = new pg.Pool({ connectionString });
  
  await client.query(`
    ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;

    UPDATE public.requisitions SET status = 'PENDING' WHERE status = 'Pending';
    UPDATE public.requisitions SET status = 'DRAFT' WHERE status = 'PENDING' AND type = 'WORKPLAN';

    ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_status_check 
      CHECK (status IN ('DRAFT', 'PENDING', 'FINANCE_BATCH', 'TL_APPROVAL', 'APPROVED', 'PAID', 'REJECTED'));
      
    CREATE OR REPLACE FUNCTION public.generate_requisitions_for_workplan(target_workplan_id UUID)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        wp_record RECORD;
        item_record RECORD;
        new_req_id UUID;
        req_num TEXT;
    BEGIN
        SELECT * INTO wp_record FROM public.monthly_workplans WHERE id = target_workplan_id AND status = 'Finalized';
        IF NOT FOUND THEN RETURN; END IF;

        FOR item_record IN
            SELECT * FROM public.workplan_items
            WHERE workplan_id = target_workplan_id AND status IN ('TL_APPROVED', 'TL_ADJUSTED')
        LOOP
            new_req_id := gen_random_uuid();
            req_num := 'WP-REQ-' || TO_CHAR(NOW(), 'YYMMDD-HH24MI') || '-' || SUBSTRING(new_req_id::TEXT, 1, 6);

            INSERT INTO public.requisitions (
                id, requisition_number, title, department_id, requester_id, status, total_amount, workplan_item_id, type, manifest_id
            ) VALUES (
                new_req_id, req_num, '[' || TO_CHAR(wp_record.month, 'Mon YYYY') || '] ' || item_record.activity,
                wp_record.department_id::UUID, wp_record.created_by::UUID, 'DRAFT',
                COALESCE(item_record.approved_amount, item_record.amount), item_record.id, 'WORKPLAN',
                wp_record.manifest_id::UUID
            );

            INSERT INTO public.requisition_items (
                id, requisition_id, description, quantity, unit_cost, total_cost, manifest_id
            ) VALUES (
                gen_random_uuid(), new_req_id, item_record.activity,
                COALESCE(item_record.approved_quantity, item_record.quantity),
                CASE WHEN COALESCE(item_record.approved_quantity, item_record.quantity) > 0 
                    THEN COALESCE(item_record.approved_amount, item_record.amount) / COALESCE(item_record.approved_quantity, item_record.quantity)
                    ELSE COALESCE(item_record.approved_amount, item_record.amount)
                END,
                COALESCE(item_record.approved_amount, item_record.amount),
                wp_record.manifest_id::UUID
            );
        END LOOP;
    END;
    $$;
  `);

  console.log("DB constraint and RPC fixed.");
  await client.end();
}

run();
