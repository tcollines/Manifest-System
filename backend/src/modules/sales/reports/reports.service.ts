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

    return { 
        cashAtHand: cashPos.cashAtHand, 
        netMobileMoney: cashPos.netMobileMoney,
        netBank: cashPos.netBank,
        inventoryCostValue: invVal.totalCostValue, 
        inventoryRetailValue: invVal.totalRetailValue, 
        outstandingBalances, 
        supplierPayables, 
        totalSupplierPaymentsMade, 
        grossProfit: allTimeStats.totalProfit 
    };
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


export async function fetchCashbookData(manifestId: string) {
    const [
        { data: salesPayments },
        { data: supplierPayments }
    ] = await Promise.all([
        supabase.from('sales_payments').select('amount, payment_method, reference, created_at, sales_orders(id)').eq('manifest_id', manifestId),
        supabase.from('sales_procurement_payments').select('amount, payment_method, transaction_reference, payment_date, sales_suppliers(name)').eq('manifest_id', manifestId)
    ]);

    const transactions: any[] = [];

    salesPayments?.forEach((p: any) => {
        transactions.push({
            date: p.created_at,
            reference: p.reference || `ORD-${p.sales_orders?.id?.substring(0, 8)}`,
            description: 'Sales Receipt',
            method: p.payment_method,
            moneyIn: Number(p.amount),
            moneyOut: 0
        });
    });

    supplierPayments?.forEach((p: any) => {
        transactions.push({
            date: p.payment_date || p.created_at,
            reference: p.transaction_reference || 'SUPP-PAY',
            description: `Payment to Supplier: ${p.sales_suppliers?.name || 'Unknown'}`,
            method: p.payment_method,
            moneyIn: 0,
            moneyOut: Number(p.amount)
        });
    });

    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const cashbook = transactions.map(t => {
        runningBalance += (t.moneyIn - t.moneyOut);
        return { ...t, runningBalance };
    });

    return { cashbook };
}

export async function fetchSupplierLedger(manifestId: string) {
    const [
        { data: requests },
        { data: payments }
    ] = await Promise.all([
        supabase.from('sales_procurement_requests').select('total_amount, request_date, created_at, status, sales_suppliers(name)').eq('manifest_id', manifestId).neq('status', 'CANCELLED'),
        supabase.from('sales_procurement_payments').select('amount, payment_date, created_at, transaction_reference, sales_suppliers(name)').eq('manifest_id', manifestId)
    ]);

    const ledger: any[] = [];
    requests?.forEach((r: any) => {
        ledger.push({
            date: r.request_date || r.created_at,
            reference: 'PROC-REQ',
            description: `Stock Requested: ${r.sales_suppliers?.name || 'Unknown'}`,
            debit: Number(r.total_amount),
            credit: 0
        });
    });
    
    payments?.forEach((p: any) => {
        ledger.push({
            date: p.payment_date || p.created_at,
            reference: p.transaction_reference || 'PROC-PAY',
            description: `Payment to Supplier: ${p.sales_suppliers?.name || 'Unknown'}`,
            debit: 0,
            credit: Number(p.amount)
        });
    });

    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBalance = 0;
    const transactions = ledger.map(t => {
        runningBalance += (t.debit - t.credit);
        return { ...t, runningBalance };
    });

    return { transactions, totalOutstanding: runningBalance };
}

export async function fetchDetailedProcurementReport(manifestId: string) {
    const { data: requests } = await supabase.from('sales_procurement_requests')
        .select('id, request_date, status, payment_status, total_amount, balance_due, sales_suppliers(name)')
        .eq('manifest_id', manifestId)
        .neq('status', 'CANCELLED')
        .order('request_date', { ascending: false });
        
    let totalValue = 0, amountPaid = 0, balanceDue = 0;
    const procurements = requests?.map((r: any) => {
        totalValue += Number(r.total_amount);
        balanceDue += Number(r.balance_due);
        amountPaid += (Number(r.total_amount) - Number(r.balance_due));
        return {
            id: r.id.substring(0, 8).toUpperCase(),
            date: r.request_date,
            supplier: r.sales_suppliers?.name || 'Unknown',
            status: r.status,
            paymentStatus: r.payment_status,
            amount: Number(r.total_amount),
            balance: Number(r.balance_due)
        };
    }) || [];
    
    return { procurements, totalValue, amountPaid, balanceDue };
}

export async function fetchDetailedSalesReport(manifestId: string) {
    const { data: orders } = await supabase.from('sales_orders')
        .select('id, created_at, total_amount, payment_status, fulfillment_status, sales_customers(full_name), sales_payments(payment_method), sales_order_items (quantity, unit_price, unit_cost_price, sales_product_variants(name, sales_products(name, sales_categories(name))))')
        .eq('manifest_id', manifestId)
        .order('created_at', { ascending: false });
        
    let totalRevenue = 0, totalOrders = 0, completedSales = 0, unpaidOrders = 0;
    const categoryStats: Record<string, { qty: number, revenue: number, profit: number }> = {};
    const productStats: Record<string, { qty: number, revenue: number }> = {};
    const recentOrders: any[] = [];
    
    orders?.forEach((o: any) => {
        totalOrders++;
        if (o.fulfillment_status === 'COMPLETED') completedSales++;
        if (o.payment_status === 'UNPAID') unpaidOrders++;
        
        if (o.fulfillment_status === 'COMPLETED') {
            totalRevenue += Number(o.total_amount);
            
            o.sales_order_items?.forEach((i: any) => {
                const qty = Number(i.quantity);
                const rev = qty * Number(i.unit_price);
                const prof = qty * (Number(i.unit_price) - Number(i.unit_cost_price));
                
                const catName = i.sales_product_variants?.sales_products?.sales_categories?.name || 'Uncategorized';
                const prodName = i.sales_product_variants?.sales_products?.name || 'Unknown Product';
                
                if (!categoryStats[catName]) categoryStats[catName] = { qty: 0, revenue: 0, profit: 0 };
                categoryStats[catName].qty += qty;
                categoryStats[catName].revenue += rev;
                categoryStats[catName].profit += prof;
                
                if (!productStats[prodName]) productStats[prodName] = { qty: 0, revenue: 0 };
                productStats[prodName].qty += qty;
                productStats[prodName].revenue += rev;
            });
        }
        
        recentOrders.push({
            date: o.created_at,
            orderNo: o.id.substring(0, 8).toUpperCase(),
            customer: o.sales_customers?.full_name || 'Walk-in',
            method: o.sales_payments?.[0]?.payment_method || '-',
            status: o.fulfillment_status,
            amount: Number(o.total_amount)
        });
    });
    
    const categories = Object.keys(categoryStats).map(k => ({ name: k, ...categoryStats[k] }));
    const products = Object.keys(productStats).map(k => ({ name: k, ...productStats[k] })).sort((a,b) => b.revenue - a.revenue).slice(0, 10);
    
    return {
        totalOrders, completedSales, unpaidOrders, totalRevenue,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        categories, products, recentOrders
    };
}


export async function fetchDetailedProfitAndLoss(manifestId: string) {
    const { data: orders } = await supabase.from('sales_orders')
        .select('id, fulfillment_status, sales_order_items (quantity, unit_price, unit_cost_price, sales_product_variants(sales_products(sales_categories(name))))')
        .eq('manifest_id', manifestId);
        
    let merchRevenue = 0, eventRevenue = 0, otherRevenue = 0;
    let inventoryCogs = 0, procurementCogs = 0;
    
    orders?.forEach((o: any) => {
        if (o.fulfillment_status === 'COMPLETED') {
            o.sales_order_items?.forEach((i: any) => {
                const qty = Number(i.quantity);
                const rev = qty * Number(i.unit_price);
                const cost = qty * Number(i.unit_cost_price);
                
                const catName = (i.sales_product_variants?.sales_products?.sales_categories?.name || '').toLowerCase();
                
                if (catName.includes('event')) eventRevenue += rev;
                else if (catName.includes('merch') || catName.includes('product') || catName.includes('book')) merchRevenue += rev;
                else otherRevenue += rev;
                
                inventoryCogs += cost;
            });
        }
    });
    
    // For now, procurement cost allocations are estimated or aggregated into inventoryCogs. 
    // Operating expenses are placeholders per requirements.
    const revenue = { merchRevenue, eventRevenue, otherRevenue, totalRevenue: merchRevenue + eventRevenue + otherRevenue };
    const cogs = { inventoryCogs, procurementCogs, totalCogs: inventoryCogs + procurementCogs };
    const grossProfit = revenue.totalRevenue - cogs.totalCogs;
    
    const operatingExpenses = {
        transport: 0,
        packaging: 0,
        printing: 0,
        eventSetup: 0,
        salaries: 0,
        utilities: 0,
        miscellaneous: 0,
        totalExpenses: 0
    };
    
    const netProfit = grossProfit - operatingExpenses.totalExpenses;
    
    return { revenue, cogs, grossProfit, operatingExpenses, netProfit };
}
