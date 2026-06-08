-- ============================================================
-- Migration 60: Requisition Generator RPC
-- Author: Manifest System
-- 
-- PostgreSQL function that generates linked requisitions
-- when a Workplan status updates to 'Finalized'.
-- ============================================================

BEGIN;

-- 1. Drop the legacy strictly CamelCased status constraint
ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;

-- 2. Standardize legacy Requisition statuses to strictly match Frontend constants
UPDATE public.requisitions SET status = 'PENDING' WHERE status = 'Pending';
UPDATE public.requisitions SET status = 'FINANCE_BATCH' WHERE status = 'Finance Batch';
UPDATE public.requisitions SET status = 'TL_APPROVAL' WHERE status = 'TL Approval';
UPDATE public.requisitions SET status = 'APPROVED' WHERE status = 'Approved';
UPDATE public.requisitions SET status = 'PAID' WHERE status = 'Paid';
UPDATE public.requisitions SET status = 'REJECTED' WHERE status = 'Rejected';

-- 3. Enforce the strict uppercase constraint on the table
ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_status_check 
  CHECK (status IN ('DRAFT', 'PENDING', 'FINANCE_BATCH', 'TL_APPROVAL', 'APPROVED', 'PAID', 'REJECTED'));

-- 4. Create the generator function 
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
    -- 1. Get the finalized workplan
    SELECT * INTO wp_record 
    FROM public.monthly_workplans 
    WHERE id = target_workplan_id AND status = 'Finalized';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workplan % not found or not finalized', target_workplan_id;
    END IF;

    -- 2. Process all approved items to generate Requisitions
    FOR item_record IN
        SELECT * FROM public.workplan_items
        WHERE workplan_id = target_workplan_id 
          AND status IN ('TL_APPROVED', 'TL_ADJUSTED')
    LOOP
        new_req_id := gen_random_uuid();
        -- Generate a pseudo-unique requisition number
        req_num := 'WP-REQ-' || TO_CHAR(NOW(), 'YYMMDD-HH24MI') || '-' || SUBSTRING(new_req_id::TEXT, 1, 6);

        INSERT INTO public.requisitions (
            id, requisition_number, title, department_id, requester_id, status, total_amount, workplan_item_id, type, date_required, manifest_id
        ) VALUES (
            new_req_id, req_num, COALESCE(NULLIF(TRIM(item_record.item), ''), item_record.activity),
            wp_record.department_id::UUID, wp_record.created_by::UUID, 'DRAFT',
            COALESCE(item_record.approved_amount, GREATEST(0, COALESCE(item_record.amount, 0) - COALESCE(item_record.dept_contribution, 0))), item_record.id, 'WORKPLAN',
            item_record.date_needed::DATE,
            wp_record.manifest_id::UUID
        );

        -- Insert solitary Requisition Item correlating to the total approved sum
        INSERT INTO public.requisition_items (
            id, requisition_id, description, quantity, unit_cost, total_cost, manifest_id
        ) VALUES (
            gen_random_uuid(), new_req_id, COALESCE(NULLIF(TRIM(item_record.item), ''), item_record.activity),
            COALESCE(item_record.approved_quantity, item_record.quantity),
            -- Prevent division by zero, set unit cost safely
            CASE 
                WHEN COALESCE(item_record.approved_quantity, item_record.quantity) > 0 
                THEN COALESCE(item_record.approved_amount, GREATEST(0, COALESCE(item_record.amount, 0) - COALESCE(item_record.dept_contribution, 0))) / COALESCE(item_record.approved_quantity, item_record.quantity)
                ELSE COALESCE(item_record.approved_amount, GREATEST(0, COALESCE(item_record.amount, 0) - COALESCE(item_record.dept_contribution, 0)))
            END,
            COALESCE(item_record.approved_amount, GREATEST(0, COALESCE(item_record.amount, 0) - COALESCE(item_record.dept_contribution, 0))),
            wp_record.manifest_id::UUID
        );

    END LOOP;
END;
$$;

-- Create an automated trigger when a workplan is finalized to fire this generator securely.
CREATE OR REPLACE FUNCTION public.trigger_workplan_finalized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only fire when the status explicitly changes to 'Finalized'
    IF NEW.status = 'Finalized' AND OLD.status IS DISTINCT FROM 'Finalized' THEN
        -- Perform the generation (will error if anything is malformed, ensuring atomic rollback)
        PERFORM public.generate_requisitions_for_workplan(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workplan_finalized ON public.monthly_workplans;
CREATE TRIGGER trg_workplan_finalized
    AFTER UPDATE ON public.monthly_workplans
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_workplan_finalized();

COMMIT;
