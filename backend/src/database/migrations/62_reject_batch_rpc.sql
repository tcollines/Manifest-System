-- ============================================================
-- Migration 62: Batch Rejection RPC
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.reject_requisition_batch(target_batch_id UUID, req_manifest_id UUID, reject_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Unlink requisitions from the batch and reset them to PENDING
    UPDATE public.requisitions
    SET batch_id = NULL,
        status = 'PENDING',
        rejection_reason = reject_reason,
        updated_at = NOW()
    WHERE batch_id = target_batch_id AND manifest_id = req_manifest_id;

    -- Mark the batch itself as REJECTED
    UPDATE public.requisition_batches
    SET status = 'REJECTED'
    WHERE id = target_batch_id;
END;
$$;

COMMIT;
