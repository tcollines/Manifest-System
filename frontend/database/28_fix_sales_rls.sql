-- Drop existing authenticated-only policies for all sales tables
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_categories" ON public.sales_categories;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_products" ON public.sales_products;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_product_variants" ON public.sales_product_variants;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_customers" ON public.sales_customers;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_order_items" ON public.sales_order_items;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_payments" ON public.sales_payments;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_receipts" ON public.sales_receipts;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_stock_taking_sessions" ON public.sales_stock_taking_sessions;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_stock_taking_items" ON public.sales_stock_taking_items;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_inventory_movements" ON public.sales_inventory_movements;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_suppliers" ON public.sales_suppliers;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_procurement_requests" ON public.sales_procurement_requests;

-- If any exist for newer tables
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_reservations" ON public.sales_reservations;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_procurement_items" ON public.sales_procurement_items;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on sales_procurement_payments" ON public.sales_procurement_payments;

-- Create permissive public policies for all sales tables since the app uses custom auth (anon role)
CREATE POLICY "Enable ALL for public on sales_categories" ON public.sales_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_products" ON public.sales_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_product_variants" ON public.sales_product_variants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_customers" ON public.sales_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_orders" ON public.sales_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_order_items" ON public.sales_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_payments" ON public.sales_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_receipts" ON public.sales_receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_stock_taking_sessions" ON public.sales_stock_taking_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_stock_taking_items" ON public.sales_stock_taking_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_inventory_movements" ON public.sales_inventory_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_suppliers" ON public.sales_suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_procurement_requests" ON public.sales_procurement_requests FOR ALL USING (true) WITH CHECK (true);

-- Ensure newer tables also have permissive RLS
CREATE POLICY "Enable ALL for public on sales_reservations" ON public.sales_reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_procurement_items" ON public.sales_procurement_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for public on sales_procurement_payments" ON public.sales_procurement_payments FOR ALL USING (true) WITH CHECK (true);
