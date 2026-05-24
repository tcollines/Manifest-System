import { supabase } from '../supabaseClient';
import { financialReportService } from './financialReportService';

export const salesSummaryService = {
  async getSummary(manifestId: string): Promise<any> {
    // 1. Get Financial Position for revenue, value, profit, balances
    const financials = await financialReportService.getFinancialPosition(manifestId);

    // 2. Low-Stock Alerts
    // We'll define "low stock" as quantity <= 5.
    const { data: lowStock, error: lowStockErr } = await supabase
      .from('sales_product_variants')
      .select('name, sku, stock_quantity')
      .eq('manifest_id', manifestId)
      .eq('is_active', true)
      .lte('stock_quantity', 5)
      .order('stock_quantity', { ascending: true })
      .limit(10);
      
    if (lowStockErr) throw lowStockErr;

    // 3. Pending Procurement Requests
    const { data: pendingProcs, error: procErr } = await supabase
      .from('sales_procurement_requests')
      .select('id, expected_date, status, sales_suppliers(name)')
      .eq('manifest_id', manifestId)
      .neq('status', 'RECEIVED')
      .neq('status', 'CANCELLED')
      .order('expected_date', { ascending: true })
      .limit(10);

    if (procErr) throw procErr;

    // 4. Best-selling Items
    // We sum up the quantity sold from COMPLETED sales_order_items.
    const { data: items, error: itemsErr } = await supabase
      .from('sales_order_items')
      .select(`
        quantity,
        sales_product_variants (name, sku),
        sales_orders (fulfillment_status)
      `);

    if (itemsErr) throw itemsErr;

    const salesCounts: Record<string, { name: string, sku: string, count: number }> = {};
    items?.forEach((i: any) => {
      if (i.sales_orders?.fulfillment_status === 'COMPLETED' && i.sales_product_variants) {
        const sku = i.sales_product_variants.sku;
        if (!salesCounts[sku]) {
          salesCounts[sku] = { name: i.sales_product_variants.name, sku, count: 0 };
        }
        salesCounts[sku].count += Number(i.quantity);
      }
    });

    const bestSellers = Object.values(salesCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 5. Total Procurement Stats
    const { data: allProcs, error: allProcsErr } = await supabase
      .from('sales_procurement_requests')
      .select('total_amount, amount_paid, balance_due')
      .eq('manifest_id', manifestId)
      .neq('status', 'CANCELLED');

    if (allProcsErr) throw allProcsErr;

    let totalProcurementValue = 0;
    allProcs?.forEach(p => {
       totalProcurementValue += Number(p.total_amount) || 0;
    });

    return {
      financials,
      lowStock: lowStock || [],
      pendingProcurements: pendingProcs || [],
      bestSellers,
      procurementStats: {
        totalProcurementValue,
        paidProcurementValue: financials.totalSupplierPaymentsMade,
        outstandingSupplierBalance: financials.supplierPayables
      }
    };
  }
};
