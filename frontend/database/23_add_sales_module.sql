-- ============================================================
-- Migration 23: Sales & Fulfillment Module
-- Author: Manifest System
-- Date: 2026-05-24
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sales_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    created_by  TEXT
);

CREATE TABLE IF NOT EXISTS public.sales_products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.sales_categories(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    image_url   TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    created_by  TEXT
);

CREATE TABLE IF NOT EXISTS public.sales_product_variants (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id    TEXT NOT NULL,
    product_id     UUID NOT NULL REFERENCES public.sales_products(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    sku            TEXT NOT NULL UNIQUE,
    barcode        TEXT UNIQUE,
    cost_price     NUMERIC(15, 2) NOT NULL DEFAULT 0,
    selling_price  NUMERIC(15, 2) NOT NULL DEFAULT 0,
    stock_quantity INT NOT NULL DEFAULT 0,
    is_active      BOOLEAN DEFAULT true,
    supplier_id    UUID,
    created_at     TIMESTAMPTZ DEFAULT now(),
    created_by     TEXT
);

CREATE TABLE IF NOT EXISTS public.sales_customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id   TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    phone_number  TEXT,
    email         TEXT,
    church_branch TEXT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    created_by    TEXT
);

CREATE TABLE IF NOT EXISTS public.sales_orders (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id        TEXT NOT NULL,
    customer_id        UUID REFERENCES public.sales_customers(id) ON DELETE SET NULL,
    total_amount       NUMERIC(15, 2) NOT NULL DEFAULT 0,
    amount_paid        NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_status     TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED')),
    fulfillment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (fulfillment_status IN ('PENDING', 'RESERVED', 'WAITING_SUPPLIER', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED')),
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now(),
    created_by         TEXT
);

CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    variant_id      UUID NOT NULL REFERENCES public.sales_product_variants(id) ON DELETE CASCADE,
    quantity        INT NOT NULL DEFAULT 1,
    unit_price      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    unit_cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id    TEXT NOT NULL,
    order_id       UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    amount         NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL,
    reference      TEXT,
    created_at     TIMESTAMPTZ DEFAULT now(),
    created_by     TEXT
);

CREATE TABLE IF NOT EXISTS public.sales_receipts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id    TEXT NOT NULL,
    order_id       UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL UNIQUE,
    created_at     TIMESTAMPTZ DEFAULT now(),
    created_by     TEXT
);

CREATE TABLE IF NOT EXISTS public.sales_stock_taking_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id   TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
    notes         TEXT,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT now(),
    created_by    TEXT
);

CREATE TABLE IF NOT EXISTS public.sales_stock_taking_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID NOT NULL REFERENCES public.sales_stock_taking_sessions(id) ON DELETE CASCADE,
    variant_id        UUID NOT NULL REFERENCES public.sales_product_variants(id) ON DELETE CASCADE,
    system_quantity   INT NOT NULL DEFAULT 0,
    physical_quantity INT NOT NULL DEFAULT 0,
    variance          INT NOT NULL DEFAULT 0,
    reason            TEXT,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_inventory_movements (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id   TEXT NOT NULL,
    variant_id    UUID NOT NULL REFERENCES public.sales_product_variants(id) ON DELETE CASCADE,
    type          TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT', 'SALE')),
    quantity      INT NOT NULL,
    reason        TEXT,
    reference_id  TEXT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    created_by    TEXT
);

CREATE TABLE IF NOT EXISTS public.sales_suppliers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id  TEXT NOT NULL,
    name         TEXT NOT NULL,
    contact_info TEXT,
    created_at   TIMESTAMPTZ DEFAULT now(),
    created_by   TEXT
);

CREATE TABLE IF NOT EXISTS public.sales_procurement_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id   TEXT NOT NULL,
    order_id      UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    supplier_id   UUID REFERENCES public.sales_suppliers(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'NOT_ORDERED' CHECK (status IN ('NOT_ORDERED', 'ORDERED', 'SUPPLIER_OUT_OF_STOCK', 'WAITING_SUPPLIER', 'IN_TRANSIT', 'RECEIVED')),
    request_date  DATE,
    expected_date DATE,
    created_at    TIMESTAMPTZ DEFAULT now(),
    created_by    TEXT
);

-- RLS
ALTER TABLE public.sales_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_stock_taking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_stock_taking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_procurement_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for authenticated users on sales_categories" ON public.sales_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_products" ON public.sales_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_product_variants" ON public.sales_product_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_customers" ON public.sales_customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_orders" ON public.sales_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_order_items" ON public.sales_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_payments" ON public.sales_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_receipts" ON public.sales_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_stock_taking_sessions" ON public.sales_stock_taking_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_stock_taking_items" ON public.sales_stock_taking_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_inventory_movements" ON public.sales_inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_suppliers" ON public.sales_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users on sales_procurement_requests" ON public.sales_procurement_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
