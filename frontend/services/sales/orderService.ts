import { supabase } from '../supabaseClient';
import { SalesOrder, SalesOrderItem, SalesVariant } from '../../modules/sales/types';

export const orderService = {
  async getOrders(manifestId: string): Promise<SalesOrder[]> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*, sales_customers(full_name)')
      .eq('manifest_id', manifestId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getOrderItems(orderId: string): Promise<SalesOrderItem[]> {
    const { data, error } = await supabase
      .from('sales_order_items')
      .select('*, sales_product_variants(*)')
      .eq('order_id', orderId);
    if (error) throw error;
    return data || [];
  },

  async createOrder(manifestId: string, payload: Partial<SalesOrder>, items: Partial<SalesOrderItem>[]): Promise<SalesOrder> {
    let requiresProcurement = false;
    let procurementSupplierId = null;

    // 1. Check stock availability for procurement logic
    for (const item of items) {
      if (!item.variant_id) continue;
      const { data: variant } = await supabase
        .from('sales_product_variants')
        .select('*')
        .eq('id', item.variant_id)
        .single();
      
      if (variant) {
        const availableStock = Math.max(0, variant.stock_quantity - (variant.reserved_quantity || 0));
        if (item.quantity && item.quantity > availableStock) {
          requiresProcurement = true;
          procurementSupplierId = variant.supplier_id; // Pick first supplier for simplicity
        }
      }
    }

    // 2. Set initial status
    const initialFulfillmentStatus = requiresProcurement ? 'WAITING_SUPPLIER' : 'PENDING';

    // 3. Create the Order
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .insert([{ 
        manifest_id: manifestId, 
        ...payload, 
        fulfillment_status: initialFulfillmentStatus 
      }])
      .select()
      .single();
    if (orderError) throw orderError;

    // 4. Create Items
    const itemsPayload = items.map(item => ({ ...item, order_id: order.id }));
    const { error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(itemsPayload);
    if (itemsError) throw itemsError;

    // 5. Create Procurement Request if needed
    if (requiresProcurement && procurementSupplierId) {
       const { data: procReq, error: procError } = await supabase
         .from('sales_procurement_requests')
         .insert([{
           manifest_id: manifestId,
           order_id: order.id,
           supplier_id: procurementSupplierId,
           status: 'WAITING_SUPPLIER',
           request_date: new Date().toISOString().split('T')[0]
         }])
         .select()
         .single();
         
       if (!procError && procReq) {
         // Link back to order
         await supabase.from('sales_orders')
           .update({ procurement_request_id: procReq.id })
           .eq('id', order.id);
       }
    }

    return order;
  }
};
