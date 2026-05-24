import { supabase } from '../supabaseClient';
import { cashPositionService } from './cashPositionService';
import { inventoryValuationService } from './inventoryValuationService';
import { reportService } from './reportService';

export const financialReportService = {
  async getFinancialPosition(manifestId: string): Promise<any> {
    // 1. Get Cash Position
    const cashPos = await cashPositionService.getCashPosition(manifestId);
    
    // 2. Get Inventory Valuation
    const invVal = await inventoryValuationService.getInventoryValuation(manifestId);
    
    // 3. Outstanding Customer Balances
    const { data: orders, error: ordersErr } = await supabase
      .from('sales_orders')
      .select('total_amount, amount_paid, payment_status, fulfillment_status')
      .eq('manifest_id', manifestId);
      
    if (ordersErr) throw ordersErr;

    let outstandingBalances = 0;
    orders?.forEach((o: any) => {
      // Exclude cancelled/refunded orders from outstanding balances
      if (o.payment_status !== 'PAID' && o.payment_status !== 'CANCELLED' && o.payment_status !== 'REFUNDED' && o.fulfillment_status !== 'CANCELLED') {
        const balance = Math.max(0, Number(o.total_amount) - Number(o.amount_paid));
        outstandingBalances += balance;
      }
    });

    // 4. Supplier Payables
    // Sum of balance_due for requests that are not cancelled and not fully paid
    const { data: procurements, error: procErr } = await supabase
      .from('sales_procurement_requests')
      .select('balance_due, amount_paid')
      .eq('manifest_id', manifestId)
      .neq('status', 'CANCELLED')
      .neq('payment_status', 'PAID');
      
    if (procErr) throw procErr;

    let supplierPayables = 0;
    let totalSupplierPaymentsMade = 0;
    
    // Also get all supplier payments ever made to show total payments
    const { data: allProcurements, error: allProcErr } = await supabase
      .from('sales_procurement_requests')
      .select('amount_paid')
      .eq('manifest_id', manifestId)
      .neq('status', 'CANCELLED');

    if (allProcErr) throw allProcErr;

    allProcurements?.forEach((req: any) => {
       totalSupplierPaymentsMade += Number(req.amount_paid) || 0;
    });

    procurements?.forEach((req: any) => {
       supplierPayables += Number(req.balance_due) || 0;
    });

    // 5. Gross Profit
    // We already have reportService that calculates this securely using only COMPLETED sales
    const allTimeStats = await reportService.getAllTimeStats(manifestId);

    return {
      cashAtHand: cashPos.cashAtHand,
      inventoryCostValue: invVal.totalCostValue,
      inventoryRetailValue: invVal.totalRetailValue,
      outstandingBalances,
      supplierPayables,
      totalSupplierPaymentsMade,
      grossProfit: allTimeStats.totalProfit
    };
  }
};
