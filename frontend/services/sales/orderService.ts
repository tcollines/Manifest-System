import { supabase } from '../supabaseClient';
import { SalesOrder, SalesOrderItem, SalesPayment } from '../../modules/sales/types';

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
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .insert([{ manifest_id: manifestId, ...payload }])
      .select()
      .single();
    if (orderError) throw orderError;

    const itemsPayload = items.map(item => ({ ...item, order_id: order.id }));
    const { error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(itemsPayload);
    if (itemsError) throw itemsError;

    return order;
  },

  async recordPayment(manifestId: string, orderId: string, amount: number, paymentMethod: string, reference?: string): Promise<void> {
    const { error } = await supabase
      .from('sales_payments')
      .insert([{ manifest_id: manifestId, order_id: orderId, amount, payment_method: paymentMethod, reference }]);
    if (error) throw error;
  },

  async updateOrderStatus(orderId: string, paymentStatus: string, fulfillmentStatus: string, amountPaid: number): Promise<void> {
    const { error } = await supabase
      .from('sales_orders')
      .update({ payment_status: paymentStatus, fulfillment_status: fulfillmentStatus, amount_paid: amountPaid, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) throw error;
  }
};
