import { supabase } from '../supabaseClient';

export const cashPositionService = {
  async getCashPosition(manifestId: string): Promise<any> {
    // 1. Get all payments
    const { data: payments, error: paymentsErr } = await supabase
      .from('sales_payments')
      .select(`
        amount,
        payment_method,
        sales_orders (
          payment_status,
          total_amount,
          amount_paid
        )
      `)
      .eq('manifest_id', manifestId);
      
    if (paymentsErr) throw paymentsErr;

    let totalCashReceived = 0;
    let totalMobileMoneyReceived = 0;
    let totalBankReceived = 0;
    let refundsIssued = 0;

    payments?.forEach((p: any) => {
      const amt = Number(p.amount);
      const method = p.payment_method?.toUpperCase();
      const order = p.sales_orders;
      
      // If the order was fully refunded, we consider the payment amount as refunded.
      // If it's partially refunded, we might need to distribute it.
      // The easiest way is to compute the difference between total payments and order.amount_paid
      // But since we group by payment, let's just do an aggregate on orders.

      if (method === 'CASH') totalCashReceived += amt;
      else if (method === 'MOBILE_MONEY' || method === 'MOBILE MONEY') totalMobileMoneyReceived += amt;
      else if (method === 'BANK') totalBankReceived += amt;
    });

    // 2. Compute refunds from orders
    // A better way to compute refunds is to sum (total_payments_for_order - order.amount_paid)
    // But since we joined payments, we can group by order.
    const { data: orders, error: ordersErr } = await supabase
      .from('sales_orders')
      .select('id, amount_paid, payment_status, total_amount')
      .eq('manifest_id', manifestId);

    if (ordersErr) throw ordersErr;

    // We can compute refunds globally by finding sum(payments) - sum(amount_paid)
    // Actually, `amount_paid` is updated in `processRefund`. So `amount_paid` is the net amount.
    // Total payments ever recorded = sum(sales_payments.amount).
    // Refunds issued = sum(sales_payments.amount) - sum(sales_orders.amount_paid).
    const totalPaymentsRecorded = payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
    const totalNetPaid = orders?.reduce((acc: number, o: any) => acc + Number(o.amount_paid), 0) || 0;
    
    refundsIssued = totalPaymentsRecorded - totalNetPaid;
    
    // 3. Get supplier payments
    const { data: supplierPayments, error: supErr } = await supabase
      .from('sales_procurement_payments')
      .select('amount, payment_method')
      .eq('manifest_id', manifestId);

    if (supErr) throw supErr;

    let supplierCashPayments = 0;
    let supplierMobileMoneyPayments = 0;
    let supplierBankPayments = 0;

    supplierPayments?.forEach((p: any) => {
      const amt = Number(p.amount);
      const method = p.payment_method?.toUpperCase();
      
      if (method === 'CASH') supplierCashPayments += amt;
      else if (method === 'MOBILE_MONEY' || method === 'MOBILE MONEY') supplierMobileMoneyPayments += amt;
      else if (method === 'BANK' || method === 'BANK TRANSFER') supplierBankPayments += amt;
    });
    
    // As per user rule: Cash at Hand = Cash Payments Received - Refunds Paid in Cash - Cash Supplier Payments.
    // We assume all refunds were issued in CASH for simplicity.
    const cashAtHand = totalCashReceived - refundsIssued - supplierCashPayments;
    
    const netMobileMoney = totalMobileMoneyReceived - supplierMobileMoneyPayments;
    const netBank = totalBankReceived - supplierBankPayments;
    const netReceivedCash = cashAtHand + netMobileMoney + netBank;

    return {
      cashPaymentsReceived: totalCashReceived,
      mobileMoneyPaymentsReceived: totalMobileMoneyReceived,
      bankPaymentsReceived: totalBankReceived,
      refundsIssued,
      supplierCashPayments,
      supplierMobileMoneyPayments,
      supplierBankPayments,
      cashAtHand,
      netMobileMoney,
      netBank,
      netReceivedCash
    };
  }
};
