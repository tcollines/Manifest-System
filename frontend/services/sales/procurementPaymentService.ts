import { supabase } from '../supabaseClient';
import { SalesProcurementPayment, SalesProcurementRequest } from '../../modules/sales/types';

export const procurementPaymentService = {
  async getPaymentsForRequest(requestId: string): Promise<SalesProcurementPayment[]> {
    const { data, error } = await supabase
      .from('sales_procurement_payments')
      .select('*')
      .eq('procurement_request_id', requestId)
      .order('payment_date', { ascending: false });

    if (error) throw new Error(`Failed to fetch payments: ${error.message}`);
    return data || [];
  },

  async recordPayment(
    manifestId: string,
    requestId: string,
    supplierId: string,
    amount: number,
    paymentMethod: string,
    recordedBy: string,
    transactionReference?: string,
    notes?: string
  ): Promise<SalesProcurementPayment> {
    if (amount <= 0) throw new Error('Payment amount must be greater than zero.');

    // 1. Check current balance to prevent overpayment
    const { data: request, error: reqError } = await supabase
      .from('sales_procurement_requests')
      .select('balance_due')
      .eq('id', requestId)
      .single();

    if (reqError) throw new Error(`Failed to fetch procurement request: ${reqError.message}`);
    if (!request) throw new Error('Procurement request not found.');

    if (amount > request.balance_due) {
      throw new Error(`Payment amount (${amount}) exceeds remaining balance (${request.balance_due}). Overpayments are not allowed.`);
    }

    // 2. Record payment
    const paymentData = {
      manifest_id: manifestId,
      procurement_request_id: requestId,
      supplier_id: supplierId,
      amount,
      payment_method: paymentMethod,
      transaction_reference: transactionReference || null,
      notes: notes || null,
      recorded_by: recordedBy
    };

    const { data: payment, error: insertError } = await supabase
      .from('sales_procurement_payments')
      .insert(paymentData)
      .select()
      .single();

    if (insertError) throw new Error(`Failed to record payment: ${insertError.message}`);

    // 3. Recalculate totals
    await this.updateProcurementFinancialTotals(requestId);

    return payment;
  },

  async deletePayment(paymentId: string, requestId: string): Promise<void> {
    const { error } = await supabase
      .from('sales_procurement_payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw new Error(`Failed to delete payment: ${error.message}`);

    // Recalculate totals after deletion
    await this.updateProcurementFinancialTotals(requestId);
  },

  async updateProcurementFinancialTotals(requestId: string): Promise<SalesProcurementRequest> {
    // 1. Get total cost from items
    const { data: items, error: itemsError } = await supabase
      .from('sales_procurement_request_items')
      .select('expected_cost, quantity_ordered')
      .eq('request_id', requestId);

    if (itemsError) throw new Error(`Failed to fetch items for total calc: ${itemsError.message}`);

    const totalAmount = (items || []).reduce((sum, item) => sum + (Number(item.expected_cost) * Number(item.quantity_ordered)), 0);

    // 2. Get total paid from payments
    const { data: payments, error: paymentsError } = await supabase
      .from('sales_procurement_payments')
      .select('amount')
      .eq('procurement_request_id', requestId);

    if (paymentsError) throw new Error(`Failed to fetch payments for total calc: ${paymentsError.message}`);

    const amountPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

    // 3. Calculate balance and status
    const balanceDue = Math.max(0, totalAmount - amountPaid);
    
    let paymentStatus = 'UNPAID';
    if (amountPaid > 0 && balanceDue > 0) {
      paymentStatus = 'PARTIAL';
    } else if (balanceDue === 0 && totalAmount > 0) {
      paymentStatus = 'PAID';
    } else if (totalAmount === 0 && amountPaid === 0) {
       paymentStatus = 'PAID'; // If there's no cost, there's no payment due
    }

    // 4. Update request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('sales_procurement_requests')
      .update({
        total_amount: totalAmount,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to update procurement request totals: ${updateError.message}`);

    return updatedRequest;
  }
};
