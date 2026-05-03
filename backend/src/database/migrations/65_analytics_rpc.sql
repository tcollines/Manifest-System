-- ============================================================
-- Migration 65: Analytics RPC Functions
-- ============================================================

BEGIN;

-- 1. Admin Workflow Summary
CREATE OR REPLACE FUNCTION public.analytics_workflow_summary(
    v_manifest_id UUID,
    v_from TIMESTAMPTZ DEFAULT (date_trunc('month', now())),
    v_to TIMESTAMPTZ DEFAULT now()
) RETURNS JSONB AS $$
DECLARE
    v_pending_reviews INT;
    v_items_approved INT;
    v_items_rejected INT;
    v_dept_rejections JSONB;
BEGIN
    -- Workplans pending review (ADMIN_REVIEW)
    SELECT COUNT(*) INTO v_pending_reviews
    FROM public.monthly_workplans
    WHERE manifest_id = v_manifest_id
      AND status = 'ADMIN_REVIEW'
      AND created_at >= v_from AND created_at <= v_to;

    -- Items approved/rejected
    SELECT 
        COUNT(*) FILTER (WHERE status IN ('ADMIN_APPROVED', 'TL_APPROVED', 'TL_ADJUSTED', 'FINALIZED')),
        COUNT(*) FILTER (WHERE status IN ('ADMIN_REJECTED', 'TL_REJECTED'))
    INTO v_items_approved, v_items_rejected
    FROM public.workplan_items
    WHERE manifest_id = v_manifest_id
      AND created_at >= v_from AND created_at <= v_to;

    -- Departments with most rejections
    SELECT jsonb_agg(row_to_json(d)) INTO v_dept_rejections
    FROM (
        SELECT 
            dep.name as department_name,
            COUNT(wi.id) as rejections
        FROM public.workplan_items wi
        JOIN public.monthly_workplans mw ON wi.workplan_id = mw.id
        JOIN public.departments dep ON mw.department_id = dep.id
        WHERE wi.manifest_id = v_manifest_id
          AND wi.status IN ('ADMIN_REJECTED', 'TL_REJECTED')
          AND wi.created_at >= v_from AND wi.created_at <= v_to
        GROUP BY dep.name
        ORDER BY rejections DESC
        LIMIT 5
    ) d;

    RETURN jsonb_build_object(
        'pending_reviews', COALESCE(v_pending_reviews, 0),
        'items_approved', COALESCE(v_items_approved, 0),
        'items_rejected', COALESCE(v_items_rejected, 0),
        'department_rejections', COALESCE(v_dept_rejections, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Department Analytics
CREATE OR REPLACE FUNCTION public.analytics_department(
    v_manifest_id UUID,
    v_dept_id UUID,
    v_from TIMESTAMPTZ DEFAULT (date_trunc('month', now())),
    v_to TIMESTAMPTZ DEFAULT now()
) RETURNS JSONB AS $$
DECLARE
    v_total_workplans INT;
    v_items_pending INT;
    v_items_approved INT;
    v_items_rejected INT;
    v_requested_budget NUMERIC;
    v_approved_budget NUMERIC;
    v_requisition_paid INT;
    v_requisition_pending INT;
BEGIN
    SELECT COUNT(*) INTO v_total_workplans
    FROM public.monthly_workplans
    WHERE manifest_id = v_manifest_id AND department_id = v_dept_id
      AND created_at >= v_from AND created_at <= v_to;

    SELECT 
        COUNT(*) FILTER (WHERE status = 'PENDING'),
        COUNT(*) FILTER (WHERE status IN ('ADMIN_APPROVED', 'TL_APPROVED', 'TL_ADJUSTED', 'FINALIZED')),
        COUNT(*) FILTER (WHERE status IN ('ADMIN_REJECTED', 'TL_REJECTED')),
        SUM(amount),
        SUM(COALESCE(approved_amount, 0))
    INTO v_items_pending, v_items_approved, v_items_rejected, v_requested_budget, v_approved_budget
    FROM public.workplan_items
    WHERE manifest_id = v_manifest_id
      AND workplan_id IN (SELECT id FROM public.monthly_workplans WHERE department_id = v_dept_id)
      AND created_at >= v_from AND created_at <= v_to;

    SELECT 
        COUNT(*) FILTER (WHERE status = 'PAID'),
        COUNT(*) FILTER (WHERE status != 'PAID' AND status != 'REJECTED')
    INTO v_requisition_paid, v_requisition_pending
    FROM public.requisitions
    WHERE manifest_id = v_manifest_id
      AND batch_id IN (SELECT id FROM public.requisition_batches WHERE department_id = v_dept_id)
      AND created_at >= v_from AND created_at <= v_to;

    RETURN jsonb_build_object(
        'total_workplans', COALESCE(v_total_workplans, 0),
        'items_pending', COALESCE(v_items_pending, 0),
        'items_approved', COALESCE(v_items_approved, 0),
        'items_rejected', COALESCE(v_items_rejected, 0),
        'requested_budget', COALESCE(v_requested_budget, 0),
        'approved_budget', COALESCE(v_approved_budget, 0),
        'requisition_paid', COALESCE(v_requisition_paid, 0),
        'requisition_pending', COALESCE(v_requisition_pending, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Finance Analytics
CREATE OR REPLACE FUNCTION public.analytics_finance(
    v_manifest_id UUID,
    v_from TIMESTAMPTZ DEFAULT (date_trunc('month', now())),
    v_to TIMESTAMPTZ DEFAULT now()
) RETURNS JSONB AS $$
DECLARE
    v_pending_payments NUMERIC;
    v_unpaid_requisitions INT;
    v_total_disbursed NUMERIC;
    v_batches_awaiting_tl INT;
BEGIN
    SELECT 
        SUM(total_amount - COALESCE(amount_paid, 0)),
        COUNT(*)
    INTO v_pending_payments, v_unpaid_requisitions
    FROM public.requisitions
    WHERE manifest_id = v_manifest_id
      AND status = 'APPROVED'
      AND created_at >= v_from AND created_at <= v_to;

    SELECT SUM(amount) INTO v_total_disbursed
    FROM public.requisition_payments
    WHERE manifest_id = v_manifest_id
      AND created_at >= v_from AND created_at <= v_to;

    SELECT COUNT(*) INTO v_batches_awaiting_tl
    FROM public.requisition_batches
    WHERE manifest_id = v_manifest_id
      AND status = 'TL_APPROVAL'
      AND created_at >= v_from AND created_at <= v_to;

    RETURN jsonb_build_object(
        'pending_payments', COALESCE(v_pending_payments, 0),
        'unpaid_requisitions', COALESCE(v_unpaid_requisitions, 0),
        'total_disbursed', COALESCE(v_total_disbursed, 0),
        'batches_awaiting_tl', COALESCE(v_batches_awaiting_tl, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Team Leader Analytics
CREATE OR REPLACE FUNCTION public.analytics_team_leader(
    v_manifest_id UUID,
    v_from TIMESTAMPTZ DEFAULT (date_trunc('month', now())),
    v_to TIMESTAMPTZ DEFAULT now()
) RETURNS JSONB AS $$
DECLARE
    v_requested_amount NUMERIC;
    v_approved_amount NUMERIC;
    v_adjustments_made NUMERIC;
    v_pending_approvals INT;
    v_department_breakdown JSONB;
BEGIN
    -- Exclude Finance and Administration
    SELECT 
        SUM(wi.amount),
        SUM(COALESCE(wi.approved_amount, 0)),
        SUM(wi.amount - COALESCE(wi.approved_amount, wi.amount))
    INTO v_requested_amount, v_approved_amount, v_adjustments_made
    FROM public.workplan_items wi
    JOIN public.monthly_workplans mw ON wi.workplan_id = mw.id
    JOIN public.departments dep ON mw.department_id = dep.id
    WHERE wi.manifest_id = v_manifest_id
      AND dep.code NOT IN ('d4', 'd0')
      AND wi.created_at >= v_from AND wi.created_at <= v_to;

    -- Workplans pending TL_REVIEW
    SELECT COUNT(*) INTO v_pending_approvals
    FROM public.monthly_workplans mw
    JOIN public.departments dep ON mw.department_id = dep.id
    WHERE mw.manifest_id = v_manifest_id
      AND dep.code NOT IN ('d4', 'd0')
      AND mw.status = 'TL_REVIEW'
      AND mw.created_at >= v_from AND mw.created_at <= v_to;

    SELECT jsonb_agg(row_to_json(d)) INTO v_department_breakdown
    FROM (
        SELECT 
            dep.name as department_name,
            SUM(wi.amount) as requested,
            SUM(COALESCE(wi.approved_amount, 0)) as approved
        FROM public.workplan_items wi
        JOIN public.monthly_workplans mw ON wi.workplan_id = mw.id
        JOIN public.departments dep ON mw.department_id = dep.id
        WHERE wi.manifest_id = v_manifest_id
          AND dep.code NOT IN ('d4', 'd0')
          AND wi.created_at >= v_from AND wi.created_at <= v_to
        GROUP BY dep.name
        ORDER BY requested DESC
    ) d;

    RETURN jsonb_build_object(
        'requested_amount', COALESCE(v_requested_amount, 0),
        'approved_amount', COALESCE(v_approved_amount, 0),
        'adjustments_made', COALESCE(v_adjustments_made, 0),
        'pending_approvals', COALESCE(v_pending_approvals, 0),
        'department_breakdown', COALESCE(v_department_breakdown, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
