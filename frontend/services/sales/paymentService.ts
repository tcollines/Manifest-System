import { supabase } from '../supabaseClient';
import { SalesOrder, SalesPaymentStatus, SalesFulfillmentStatus } from '../../modules/sales/types';
import { fulfillmentService } from './fulfillmentService';

export const paymentService = {
  /**
   * Records a new payment and evaluates the order payment status.
   * May trigger stock reservation if order becomes PARTIAL or PAID.
   */
  async recordPayment(manifestId: string, orderId: string, amount: number, paymentMethod: string, reference?: string): Promise<void> {
    // 1. Record the payment
    const { error: insertErr } = await supabase
      .from('sales_payments')
      .insert([{ manifest_id: manifestId, order_id: orderId, amount, payment_method: paymentMethod, reference }]);
    if (insertErr) throw insertErr;

    // 2. Fetch order to calculate new status
    const { data: order, error: orderErr } = await supabase
      .from('sales_orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (orderErr || !order) throw orderErr || new Error('Order not found');

    const newAmountPaid = Number(order.amount_paid) + Number(amount);
    let newPaymentStatus: SalesPaymentStatus = 'UNPAID';

    if (newAmountPaid > 0 && newAmountPaid < Number(order.total_amount)) {
      newPaymentStatus = 'PARTIAL';
    } else if (newAmountPaid >= Number(order.total_amount)) {
      newPaymentStatus = 'PAID';
    }

    // 3. Update Order
    const { error: updateErr } = await supabase
      .from('sales_orders')
      .update({ 
        amount_paid: newAmountPaid, 
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    if (updateErr) throw updateErr;

    // 4. Trigger Fulfillment Logic
    // If order was PENDING and is now partially or fully paid, reserve stock
    if ((newPaymentStatus === 'PARTIAL' || newPaymentStatus === 'PAID') && order.fulfillment_status === 'PENDING') {
      await fulfillmentService.reserveOrderStock(manifestId, orderId);
    }
  },

  /**
   * Process a refund for an order.
   * If stock was not yet released, it removes the reservation.
   * If stock was already released, we must rely on a return workflow (not handled here).
   */
  async processRefund(manifestId: string, orderId: string, refundAmount: number, reason: string): Promise<void> {
    const { data: order } = await supabase.from('sales_orders').select('*').eq('id', orderId).single();
    if (!order) throw new Error('Order not found');

    const newAmountPaid = Math.max(0, Number(order.amount_paid) - refundAmount);
    let newPaymentStatus: SalesPaymentStatus = 'REFUNDED';
    let newFulfillmentStatus: SalesFulfillmentStatus = order.fulfillment_status;

    if (order.fulfillment_status === 'RESERVED' || order.fulfillment_status === 'PENDING') {
       await fulfillmentService.releaseReservation(manifestId, orderId, 'Order refunded');
       newFulfillmentStatus = 'CANCELLED';
    }

    await supabase.from('sales_orders').update({
      amount_paid: newAmountPaid,
      payment_status: newPaymentStatus,
      fulfillment_status: newFulfillmentStatus,
      updated_at: new Date().toISOString()
    }).eq('id', orderId);
  }
};
