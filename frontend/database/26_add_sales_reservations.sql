-- Migration 26: Add Sales Reservations & History RPC
-- Author: Manifest System
-- Date: 2026-05-24

-- 1. Add reserved_quantity to sales_product_variants
ALTER TABLE public.sales_product_variants 
ADD COLUMN IF NOT EXISTS reserved_quantity INT NOT NULL DEFAULT 0;

-- 2. Modify sales_inventory_movements type constraint to include new movement types
ALTER TABLE public.sales_inventory_movements DROP CONSTRAINT IF EXISTS sales_inventory_movements_type_check;
ALTER TABLE public.sales_inventory_movements ADD CONSTRAINT sales_inventory_movements_type_check 
CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT', 'SALE', 'RESERVATION', 'RESERVATION_RELEASE', 'REFUND', 'RETURN', 'PROCUREMENT_RECEIPT'));

-- 3. Add procurement tracking to sales_orders
-- Note: We need to make sure sales_procurement_requests exists before adding the reference, which it does from migration 23.
ALTER TABLE public.sales_orders 
ADD COLUMN IF NOT EXISTS procurement_request_id UUID REFERENCES public.sales_procurement_requests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fulfillment_source TEXT;

-- 4. Create an RPC for Customer History
CREATE OR REPLACE FUNCTION public.get_customer_sales_history(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_orders INT;
    v_total_purchases NUMERIC(15, 2);
    v_outstanding_balance NUMERIC(15, 2);
    v_orders JSONB;
    v_payments JSONB;
    v_result JSONB;
BEGIN
    -- Get aggregates
    SELECT 
        COUNT(*),
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(total_amount - amount_paid), 0)
    INTO 
        v_total_orders, 
        v_total_purchases, 
        v_outstanding_balance
    FROM public.sales_orders
    WHERE customer_id = p_customer_id;

    -- Get recent orders
    SELECT COALESCE(jsonb_agg(row_to_json(o)), '[]'::jsonb)
    INTO v_orders
    FROM (
        SELECT id, total_amount, amount_paid, payment_status, fulfillment_status, created_at
        FROM public.sales_orders
        WHERE customer_id = p_customer_id
        ORDER BY created_at DESC
        LIMIT 10
    ) o;

    -- Get recent payments
    SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb)
    INTO v_payments
    FROM (
        SELECT p.id, p.amount, p.payment_method, p.reference, p.created_at, o.id as order_id
        FROM public.sales_payments p
        JOIN public.sales_orders o ON p.order_id = o.id
        WHERE o.customer_id = p_customer_id
        ORDER BY p.created_at DESC
        LIMIT 10
    ) p;

    -- Compile result
    v_result := jsonb_build_object(
        'total_orders', v_total_orders,
        'total_purchases', v_total_purchases,
        'outstanding_balance', v_outstanding_balance,
        'recent_orders', v_orders,
        'recent_payments', v_payments
    );

    RETURN v_result;
END;
$$;
