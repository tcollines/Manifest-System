import { supabase } from '../../../supabase';

export async function fetchCashPosition(manifestId: string) {
    const [
        { data: payments },
        { data: orders },
        { data: supplierPayments }
    ] = await Promise.all([
        supabase.from('sales_payments').select('amount, payment_method, sales_orders (payment_status, total_amount, amount_paid)').eq('manifest_id', manifestId),
        supabase.from('sales_orders').select('id, amount_paid, payment_status, total_amount').eq('manifest_id', manifestId),
        supabase.from('sales_procurement_payments').select('amount, payment_method').eq('manifest_id', manifestId)
    ]);
    
    let totalCashReceived = 0, totalMobileMoneyReceived = 0, totalBankReceived = 0;
    
    payments?.forEach((p: any) => {
        const amt = Number(p.amount);
        const method = p.payment_method?.toUpperCase();
        if (method === 'CASH') totalCashReceived += amt;
        else if (method === 'MOBILE_MONEY' || method === 'MOBILE MONEY') totalMobileMoneyReceived += amt;
        else if (method === 'BANK') totalBankReceived += amt;
    });

    const totalPaymentsRecorded = payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
    const totalNetPaid = orders?.reduce((acc, o) => acc + Number(o.amount_paid), 0) || 0;
    const refundsIssued = totalPaymentsRecorded - totalNetPaid;

    let supplierCashPayments = 0, supplierMobileMoneyPayments = 0, supplierBankPayments = 0;
    supplierPayments?.forEach((p: any) => {
        const amt = Number(p.amount);
        const method = p.payment_method?.toUpperCase();
        if (method === 'CASH') supplierCashPayments += amt;
        else if (method === 'MOBILE_MONEY' || method === 'MOBILE MONEY') supplierMobileMoneyPayments += amt;
        else if (method === 'BANK' || method === 'BANK TRANSFER') supplierBankPayments += amt;
    });

    const cashAtHand = totalCashReceived - refundsIssued - supplierCashPayments;
    const netMobileMoney = totalMobileMoneyReceived - supplierMobileMoneyPayments;
    const netBank = totalBankReceived - supplierBankPayments;
    const netReceivedCash = cashAtHand + netMobileMoney + netBank;

    return { cashPaymentsReceived: totalCashReceived, mobileMoneyPaymentsReceived: totalMobileMoneyReceived, bankPaymentsReceived: totalBankReceived, refundsIssued, supplierCashPayments, supplierMobileMoneyPayments, supplierBankPayments, cashAtHand, netMobileMoney, netBank, netReceivedCash };
}

export async function fetchInventoryValuation(manifestId: string) {
    const { data: variants } = await supabase.from('sales_product_variants').select('id, name, sku, cost_price, selling_price, stock_quantity, sales_products (name)').eq('manifest_id', manifestId).eq('is_active', true);
    let totalCostValue = 0, totalRetailValue = 0;
    const items = variants?.map((v: any) => {
        const qty = Number(v.stock_quantity), cost = Number(v.cost_price), retail = Number(v.selling_price);
        const costValue = qty * cost, retailValue = qty * retail;
        totalCostValue += costValue;
        totalRetailValue += retailValue;
        return { id: v.id, productName: v.sales_products?.name || 'Unknown Product', variantName: v.name, sku: v.sku, stockQuantity: qty, costPrice: cost, sellingPrice: retail, inventoryCostValue: costValue, inventoryRetailValue: retailValue };
    }) || [];
    return { items, totalCostValue, totalRetailValue };
}

export async function fetchAllTimeStats(manifestId: string) {
    const { data } = await supabase.from('sales_orders').select('id, total_amount, amount_paid, fulfillment_status, sales_order_items (quantity, unit_price, unit_cost_price)').eq('manifest_id', manifestId);
    let totalSales = 0, totalProfit = 0, completedOrdersCount = 0, pendingOrdersCount = 0;
    data?.forEach((order: any) => {
        if (order.fulfillment_status === 'COMPLETED') {
            completedOrdersCount++;
            totalSales += Number(order.total_amount);
            order.sales_order_items?.forEach((item: any) => {
                totalProfit += (Number(item.unit_price) - Number(item.unit_cost_price)) * Number(item.quantity);
            });
        } else pendingOrdersCount++;
    });
    return { totalSales, totalProfit, completedOrdersCount, pendingOrdersCount, orders: data };
}

export async function fetchFinancialPosition(manifestId: string) {
    const [
        cashPos,
        invVal,
        allTimeStats,
        { data: orders },
        { data: procurements }
    ] = await Promise.all([
        fetchCashPosition(manifestId),
        fetchInventoryValuation(manifestId),
        fetchAllTimeStats(manifestId),
        supabase.from('sales_orders').select('total_amount, amount_paid, payment_status, fulfillment_status').eq('manifest_id', manifestId),
        supabase.from('sales_procurement_requests').select('balance_due, amount_paid, status').eq('manifest_id', manifestId).neq('status', 'CANCELLED')
    ]);

    let outstandingBalances = 0;
    orders?.forEach((o: any) => {
        if (o.payment_status !== 'PAID' && o.payment_status !== 'CANCELLED' && o.payment_status !== 'REFUNDED' && o.fulfillment_status !== 'CANCELLED') {
            outstandingBalances += Math.max(0, Number(o.total_amount) - Number(o.amount_paid));
        }
    });

    let supplierPayables = 0, totalSupplierPaymentsMade = 0;
    procurements?.forEach((req: any) => {
        totalSupplierPaymentsMade += Number(req.amount_paid) || 0;
        if (req.status !== 'PAID') supplierPayables += Number(req.balance_due) || 0;
    });

    return { cashAtHand: cashPos.cashAtHand, inventoryCostValue: invVal.totalCostValue, inventoryRetailValue: invVal.totalRetailValue, outstandingBalances, supplierPayables, totalSupplierPaymentsMade, grossProfit: allTimeStats.totalProfit };
}

export async function getDailySales(manifestId: string, dateStr: string) {
    const { data, error } = await supabase.from('sales_orders')
        .select('id, total_amount, amount_paid, fulfillment_status, sales_order_items (quantity, unit_price, unit_cost_price)')
        .eq('manifest_id', manifestId)
        .gte('created_at', `${dateStr}T00:00:00.000Z`)
        .lte('created_at', `${dateStr}T23:59:59.999Z`);
    if (error) throw error;
    let totalSales = 0, totalProfit = 0, completedOrdersCount = 0, pendingOrdersCount = 0;
    data?.forEach((order: any) => {
        if (order.fulfillment_status === 'COMPLETED') {
            completedOrdersCount++; totalSales += Number(order.total_amount);
            order.sales_order_items?.forEach((item: any) => { totalProfit += (Number(item.unit_price) - Number(item.unit_cost_price)) * Number(item.quantity); });
        } else pendingOrdersCount++;
    });
    return { totalSales, totalProfit, completedOrdersCount, pendingOrdersCount, orders: data };
}

export async function getSalesSummary(manifestId: string) {
    const [
        financials,
        { data: lowStock },
        { data: pendingProcs },
        { data: items }
    ] = await Promise.all([
        fetchFinancialPosition(manifestId),
        supabase.from('sales_product_variants').select('name, sku, stock_quantity').eq('manifest_id', manifestId).eq('is_active', true).lte('stock_quantity', 5).order('stock_quantity', { ascending: true }).limit(10),
        supabase.from('sales_procurement_requests').select('id, expected_date, status, sales_suppliers(name)').eq('manifest_id', manifestId).neq('status', 'RECEIVED').neq('status', 'CANCELLED').order('expected_date', { ascending: true }).limit(10),
        supabase.from('sales_order_items').select('quantity, sales_product_variants (name, sku), sales_orders!inner (manifest_id, fulfillment_status)').eq('sales_orders.manifest_id', manifestId)
    ]);
    
    const salesCounts: Record<string, { name: string, sku: string, count: number }> = {};
    items?.forEach((i: any) => {
        if (i.sales_orders?.fulfillment_status === 'COMPLETED' && i.sales_product_variants) {
            const sku = i.sales_product_variants.sku;
            if (!salesCounts[sku]) salesCounts[sku] = { name: i.sales_product_variants.name, sku, count: 0 };
            salesCounts[sku].count += Number(i.quantity);
        }
    });
    const bestSellers = Object.values(salesCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
        financials, lowStock: lowStock || [], pendingProcurements: pendingProcs || [], bestSellers,
        procurementStats: { totalProcurementValue: 0, paidProcurementValue: financials.totalSupplierPaymentsMade, outstandingSupplierBalance: financials.supplierPayables }
    };
}
