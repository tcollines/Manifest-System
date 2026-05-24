import { supabase } from '../supabaseClient';
import { SalesOrder, SalesOrderItem, SalesVariant, SalesFulfillmentStatus } from '../../modules/sales/types';

export const fulfillmentService = {
  /**
   * Reserves stock for an order if not already reserved.
   * Increments reserved_quantity on variants and creates RESERVATION inventory movements.
   */
  async reserveOrderStock(manifestId: string, orderId: string): Promise<void> {
    const { data: order } = await supabase.from('sales_orders').select('*').eq('id', orderId).single();
    if (!order || order.fulfillment_status !== 'PENDING') return;

    const { data: items } = await supabase.from('sales_order_items').select('*, sales_product_variants(*)').eq('order_id', orderId);
    if (!items || items.length === 0) return;

    for (const item of items) {
      const variant = item.sales_product_variants as SalesVariant;
      
      // Increment reserved_quantity
      await supabase.rpc('increment_reserved_quantity', { p_variant_id: item.variant_id, p_qty: item.quantity });
      // If RPC doesn't exist, fallback to direct update
      const { error: updateErr } = await supabase
        .from('sales_product_variants')
        .update({ reserved_quantity: (variant.reserved_quantity || 0) + item.quantity })
        .eq('id', item.variant_id);

      if (!updateErr) {
        // Record movement
        await supabase.from('sales_inventory_movements').insert([{
          manifest_id: manifestId,
          variant_id: item.variant_id,
          type: 'RESERVATION',
          quantity: item.quantity,
          reason: 'Order partially or fully paid',
          reference_id: orderId
        }]);
      }
    }

    // Update fulfillment status to RESERVED
    await supabase.from('sales_orders').update({ fulfillment_status: 'RESERVED' }).eq('id', orderId);
  },

  /**
   * Completes the fulfillment process for a paid order.
   * Reduces physical stock, removes reservation, and records SALE movement.
   */
  async fulfillOrder(manifestId: string, orderId: string): Promise<void> {
    const { data: order } = await supabase.from('sales_orders').select('*').eq('id', orderId).single();
    if (!order || order.payment_status !== 'PAID') {
        throw new Error('NO ITEM RELEASE BEFORE FULL PAYMENT');
    }

    const { data: items } = await supabase.from('sales_order_items').select('*, sales_product_variants(*)').eq('order_id', orderId);
    if (!items || items.length === 0) return;

    const wasReserved = order.fulfillment_status === 'RESERVED';

    for (const item of items) {
      const variant = item.sales_product_variants as SalesVariant;
      
      let updatePayload: any = {
        stock_quantity: Math.max(0, variant.stock_quantity - item.quantity)
      };

      if (wasReserved) {
        updatePayload.reserved_quantity = Math.max(0, (variant.reserved_quantity || 0) - item.quantity);
        
        // Record reservation release
        await supabase.from('sales_inventory_movements').insert([{
          manifest_id: manifestId,
          variant_id: item.variant_id,
          type: 'RESERVATION_RELEASE',
          quantity: item.quantity,
          reason: 'Order fulfilled',
          reference_id: orderId
        }]);
      }

      await supabase.from('sales_product_variants').update(updatePayload).eq('id', item.variant_id);

      // Record sale movement
      await supabase.from('sales_inventory_movements').insert([{
        manifest_id: manifestId,
        variant_id: item.variant_id,
        type: 'SALE',
        quantity: item.quantity,
        reason: 'Order completed',
        reference_id: orderId
      }]);
    }

    // Update status to COMPLETED
    await supabase.from('sales_orders').update({ fulfillment_status: 'COMPLETED' }).eq('id', orderId);
  },

  /**
   * Releases reserved stock when an order is cancelled or refunded before release.
   */
  async releaseReservation(manifestId: string, orderId: string, reason: string): Promise<void> {
    const { data: order } = await supabase.from('sales_orders').select('*').eq('id', orderId).single();
    if (!order || order.fulfillment_status !== 'RESERVED') return;

    const { data: items } = await supabase.from('sales_order_items').select('*, sales_product_variants(*)').eq('order_id', orderId);
    if (!items) return;

    for (const item of items) {
      const variant = item.sales_product_variants as SalesVariant;
      
      await supabase
        .from('sales_product_variants')
        .update({ reserved_quantity: Math.max(0, (variant.reserved_quantity || 0) - item.quantity) })
        .eq('id', item.variant_id);

      await supabase.from('sales_inventory_movements').insert([{
        manifest_id: manifestId,
        variant_id: item.variant_id,
        type: 'RESERVATION_RELEASE',
        quantity: item.quantity,
        reason: reason,
        reference_id: orderId
      }]);
    }
  }
};
