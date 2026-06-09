import { supabase } from '../../../supabase';
import { logAudit, computeChangedFields } from '../../../services/audit/auditService';

export const recordOrderPayment = async (manifestId: string, payload: any, auditContext: any) => {
    const { orderId, amount, paymentMethod, reference } = payload;
    
    const { error: insertErr } = await supabase.from('sales_payments').insert([{ 
        manifest_id: manifestId, order_id: orderId, amount, payment_method: paymentMethod, reference 
    }]);
    if (insertErr) throw insertErr;

    const { data: order, error: orderErr } = await supabase.from('sales_orders').select('*').eq('id', orderId).eq('manifest_id', manifestId).single();
    if (orderErr || !order) throw orderErr || new Error('Order not found');

    const newAmountPaid = Number(order.amount_paid) + Number(amount);
    let newPaymentStatus = 'UNPAID';
    if (newAmountPaid > 0 && newAmountPaid < Number(order.total_amount)) newPaymentStatus = 'PARTIAL';
    else if (newAmountPaid >= Number(order.total_amount)) newPaymentStatus = 'PAID';

    const { data: updatedOrder, error: updateErr } = await supabase.from('sales_orders').update({ 
        amount_paid: newAmountPaid, payment_status: newPaymentStatus, updated_at: new Date().toISOString() 
    }).eq('id', orderId).select().single();
    if (updateErr) throw updateErr;

    if ((newPaymentStatus === 'PARTIAL' || newPaymentStatus === 'PAID') && order.fulfillment_status === 'PENDING') {
        await reserveOrderStock(manifestId, orderId);
    }

    logAudit({
        ...auditContext,
        actionType: 'RECORD_ORDER_PAYMENT',
        moduleName: 'sales',
        entityName: 'sales_orders',
        entityId: orderId,
        beforeValues: order,
        afterValues: updatedOrder,
        changedFields: computeChangedFields(order, updatedOrder)
    });

    return newPaymentStatus;
};

export const processRefund = async (manifestId: string, payload: any, auditContext: any) => {
    const { orderId, refundAmount, reason } = payload;
    
    const { data: order } = await supabase.from('sales_orders').select('*').eq('id', orderId).eq('manifest_id', manifestId).single();
    if (!order) throw new Error('Order not found');

    const newAmountPaid = Math.max(0, Number(order.amount_paid) - refundAmount);
    let newPaymentStatus = 'REFUNDED';
    let newFulfillmentStatus = order.fulfillment_status;

    if (order.fulfillment_status === 'RESERVED' || order.fulfillment_status === 'PENDING') {
       await releaseReservation(manifestId, orderId, 'Order refunded');
       newFulfillmentStatus = 'CANCELLED';
    }

    const { data: updatedOrder, error } = await supabase.from('sales_orders').update({ 
        amount_paid: newAmountPaid, payment_status: newPaymentStatus, fulfillment_status: newFulfillmentStatus, updated_at: new Date().toISOString() 
    }).eq('id', orderId).select().single();
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'PROCESS_REFUND',
        moduleName: 'sales',
        entityName: 'sales_orders',
        entityId: orderId,
        beforeValues: order,
        afterValues: updatedOrder,
        changedFields: computeChangedFields(order, updatedOrder)
    });
};

export const fulfillOrder = async (manifestId: string, orderId: string, auditContext: any) => {
    const { data: order } = await supabase.from('sales_orders').select('*').eq('id', orderId).eq('manifest_id', manifestId).single();
    if (!order || order.payment_status !== 'PAID') throw new Error('NO ITEM RELEASE BEFORE FULL PAYMENT');

    const { data: items } = await supabase.from('sales_order_items').select('*, sales_product_variants(*)').eq('order_id', orderId);
    if (!items || items.length === 0) throw new Error('No items in order');

    const wasReserved = order.fulfillment_status === 'RESERVED';
    
    let movements: any[] = [];
    const updatePromises = items.map(async (item) => {
        const variant = item.sales_product_variants as any;
        let updatePayload: any = { stock_quantity: Math.max(0, variant.stock_quantity - item.quantity) };

        if (wasReserved) {
            updatePayload.reserved_quantity = Math.max(0, (variant.reserved_quantity || 0) - item.quantity);
        }
        await supabase.from('sales_product_variants').update(updatePayload).eq('id', item.variant_id);
    });

    await Promise.all(updatePromises);

    for (const item of items) {
         if (wasReserved) {
              movements.push({ manifest_id: manifestId, variant_id: item.variant_id, type: 'RESERVATION_RELEASE', quantity: item.quantity, reason: 'Order fulfilled', reference_id: orderId });
         }
         movements.push({ manifest_id: manifestId, variant_id: item.variant_id, type: 'SALE', quantity: item.quantity, reason: 'Order completed', reference_id: orderId });
    }
    
    if (movements.length > 0) {
        await supabase.from('sales_inventory_movements').insert(movements);
    }
    
    const { data: updatedOrder, error } = await supabase.from('sales_orders').update({ fulfillment_status: 'COMPLETED' }).eq('id', orderId).select().single();
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'FULFILL_ORDER',
        moduleName: 'sales',
        entityName: 'sales_orders',
        entityId: orderId,
        beforeValues: order,
        afterValues: updatedOrder,
        changedFields: computeChangedFields(order, updatedOrder)
    });
};

async function reserveOrderStock(manifestId: string, orderId: string) {
    const { data: items } = await supabase.from('sales_order_items').select('*, sales_product_variants(*)').eq('order_id', orderId);
    if (!items || items.length === 0) return;

    const updatePromises = items.map(async (item) => {
        const variant = item.sales_product_variants as any;
        const { error } = await supabase.rpc('increment_reserved_quantity', { p_variant_id: item.variant_id, p_qty: item.quantity });
        if (error) {
            await supabase.from('sales_product_variants').update({ reserved_quantity: (variant.reserved_quantity || 0) + item.quantity }).eq('id', item.variant_id);
        }
    });
    await Promise.all(updatePromises);
    
    const movements = items.map(item => ({
        manifest_id: manifestId, variant_id: item.variant_id, type: 'RESERVATION', quantity: item.quantity, reason: 'Order partially or fully paid', reference_id: orderId
    }));
    if (movements.length > 0) {
        await supabase.from('sales_inventory_movements').insert(movements);
    }
    await supabase.from('sales_orders').update({ fulfillment_status: 'RESERVED' }).eq('id', orderId);
}

async function releaseReservation(manifestId: string, orderId: string, reason: string) {
    const { data: items } = await supabase.from('sales_order_items').select('*, sales_product_variants(*)').eq('order_id', orderId);
    if (!items) return;

    const updatePromises = items.map(async (item) => {
        const variant = item.sales_product_variants as any;
        await supabase.from('sales_product_variants').update({ reserved_quantity: Math.max(0, (variant.reserved_quantity || 0) - item.quantity) }).eq('id', item.variant_id);
    });
    await Promise.all(updatePromises);

    const movements = items.map(item => ({
        manifest_id: manifestId, variant_id: item.variant_id, type: 'RESERVATION_RELEASE', quantity: item.quantity, reason: reason, reference_id: orderId
    }));
    if (movements.length > 0) {
        await supabase.from('sales_inventory_movements').insert(movements);
    }
}

export const getProcurementPayments = async (manifestId: string, requestId: string) => {
    const { data, error } = await supabase.from('sales_procurement_payments').select('*').eq('procurement_request_id', requestId).order('payment_date', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const recordProcurementPayment = async (manifestId: string, payload: any, auditContext: any) => {
    const { requestId, supplierId, amount, paymentMethod, recordedBy, transactionReference, notes } = payload;
    
    if (amount <= 0) throw new Error('Payment amount must be greater than zero.');
    const { data: request, error: reqError } = await supabase.from('sales_procurement_requests').select('balance_due').eq('id', requestId).eq('manifest_id', manifestId).single();
    if (reqError || !request) throw reqError || new Error('Procurement request not found.');
    if (amount > request.balance_due) throw new Error(`Payment amount exceeds remaining balance (${request.balance_due}).`);

    const paymentData = { manifest_id: manifestId, procurement_request_id: requestId, supplier_id: supplierId, amount, payment_method: paymentMethod, transaction_reference: transactionReference || null, notes: notes || null, recorded_by: recordedBy };
    const { data: payment, error: insertError } = await supabase.from('sales_procurement_payments').insert(paymentData).select().single();
    if (insertError) throw insertError;

    await updateProcurementFinancialTotals(requestId);

    logAudit({
        ...auditContext,
        actionType: 'RECORD_PROCUREMENT_PAYMENT',
        moduleName: 'sales',
        entityName: 'sales_procurement_payments',
        entityId: payment.id,
        afterValues: payment
    });

    return payment;
};

export const deleteProcurementPayment = async (manifestId: string, paymentId: string, requestId: string, auditContext: any) => {
    const { data: beforeData } = await supabase.from('sales_procurement_payments').select('*').eq('id', paymentId).single();

    const { error } = await supabase.from('sales_procurement_payments').delete().eq('id', paymentId).eq('manifest_id', manifestId);
    if (error) throw error;
    
    await updateProcurementFinancialTotals(requestId);

    if (beforeData) {
        logAudit({
            ...auditContext,
            actionType: 'DELETE_PROCUREMENT_PAYMENT',
            moduleName: 'sales',
            entityName: 'sales_procurement_payments',
            entityId: paymentId,
            beforeValues: beforeData
        });
    }
};

export async function updateProcurementFinancialTotals(requestId: string) {
    const { data: items } = await supabase.from('sales_procurement_request_items').select('expected_cost, quantity_ordered').eq('request_id', requestId);
    const totalAmount = Math.round((items || []).reduce((sum, item) => sum + (Number(item.expected_cost) * Number(item.quantity_ordered)), 0));

    const { data: payments } = await supabase.from('sales_procurement_payments').select('amount').eq('procurement_request_id', requestId);
    const amountPaid = Math.round((payments || []).reduce((sum, p) => sum + Number(p.amount), 0));

    const balanceDue = Math.max(0, totalAmount - amountPaid);
    let paymentStatus = 'UNPAID';
    if (amountPaid > 0 && balanceDue > 0) paymentStatus = 'PARTIAL';
    else if (balanceDue === 0 && totalAmount > 0) paymentStatus = 'PAID';
    else if (totalAmount === 0 && amountPaid === 0) paymentStatus = 'PAID';

    await supabase.from('sales_procurement_requests').update({ total_amount: totalAmount, amount_paid: amountPaid, balance_due: balanceDue, payment_status: paymentStatus }).eq('id', requestId);
}
