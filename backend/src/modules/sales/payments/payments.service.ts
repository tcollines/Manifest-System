import { supabase } from '../../../supabase';
import { logAudit, computeChangedFields } from '../../../services/audit/auditService';
import { SALES_RPC } from '../shared/salesConstants';
import { SalesRequestError } from '../shared/salesErrors';
import { parseOrThrow } from '../../../shared/validators/common';
import { FulfillOrderSchema } from '../../../shared/validators/salesSchemas';

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

/**
 * Hand over everything outstanding on an order. Runs sales_fulfill_order
 * (migration 48), which is a wrapper over sales_record_delivery, so the stock
 * decrement, the reservation release, the movements, the delivery row and its
 * lines all happen in one transaction with the order row locked.
 *
 * What the service code that stood here did instead:
 *
 *   - Read each variant, subtracted in JavaScript and wrote the result back,
 *     with a Promise.all racing the writes against each other and against any
 *     concurrent sale. Nothing was locked and nothing was atomic.
 *   - Flipped fulfillment_status to COMPLETED directly, so an order could be
 *     fulfilled twice and the stock taken twice — there was no check that it
 *     was not already COMPLETED, and none that it was not CANCELLED.
 *   - Wrote no delivery, which since migration 48 is the row revenue is
 *     recognised from. Every fulfilment through here was a sale the P&L would
 *     not have counted.
 *
 * The RPC keeps the precondition this function has always enforced — no item
 * release before full payment — but raises it as SALES_NOT_FULLY_PAID, which
 * the controller maps to a 422 rather than the untyped Error thrown here
 * before.
 */
export const fulfillOrder = async (manifestId: string, payload: any, auditContext: any) => {
    const { orderId } = parseOrThrow(FulfillOrderSchema, payload);

    // Read first, for the audit trail's before-values. The RPC re-reads the row
    // under a lock, so this is a snapshot for the log, not a check anything
    // depends on — the decision to allow the fulfilment is taken inside the
    // transaction, not here.
    const { data: before } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('id', orderId)
        .eq('manifest_id', manifestId)
        .maybeSingle();

    if (!before) throw SalesRequestError.notFound(`Order ${orderId} not found`);

    const { data, error } = await supabase.rpc(SALES_RPC.FULFILL_ORDER, {
        p_manifest_id: manifestId,
        p_order_id: orderId,
        p_created_by: auditContext?.actorName ?? auditContext?.actorId ?? null
    });
    if (error) throw error;

    const after = { ...before, fulfillment_status: data?.fulfillment_status };

    await logAudit({
        ...auditContext,
        actionType: 'FULFILL_ORDER',
        moduleName: 'sales',
        entityName: 'sales_orders',
        entityId: orderId,
        beforeValues: before,
        afterValues: { ...after, delivery_id: data?.delivery_id ?? null },
        changedFields: computeChangedFields(before, after)
    });

    return data;
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

/**
 * Payments recorded against a purchase order, for this manifest only.
 *
 * The manifest filter is not decoration. This function took `manifestId` and
 * ignored it, keying on the request id alone, so a payment row carrying a
 * different `manifest_id` than the order it points at was listed against that
 * order regardless of who was asking. Legacy rows carry the sentinel manifest
 * '00000000-…' and, in a couple of cases, a department id, so this was not
 * hypothetical — a sentinel payment was showing on a Sales order.
 */
export const getProcurementPayments = async (manifestId: string, requestId: string) => {
    const { data, error } = await supabase
        .from('sales_procurement_payments')
        .select('*')
        .eq('manifest_id', manifestId)
        .eq('procurement_request_id', requestId)
        .order('payment_date', { ascending: false });
    if (error) throw error;
    return data || [];
};

/**
 * recordProcurementPayment and deleteProcurementPayment lived here.
 *
 * The first inserted into sales_procurement_payments directly and never set
 * account_id, so the payment was invisible to sales_account_ledger (migration
 * 40 filters on account_id IS NOT NULL) and no money account was ever debited.
 * It also read balance_due, then inserted, then recomputed totals — three
 * statements with no lock, so two concurrent payments could each pass a balance
 * test the other invalidated. CLAUDE.md requires money mutations to be a single
 * atomic RPC taking SELECT ... FOR UPDATE on the row they debit.
 *
 * Use sales_record_supplier_payment (migration 44) via
 * procurementService.recordSupplierPayment instead.
 *
 * The second was removed because it had no role check — any authenticated
 * caller could erase a payment — and because it recomputed the order totals
 * through an unscoped query. It did not corrupt balances: sales_account_ledger
 * is a view and sales_account_balance sums it live, so deleting the row also
 * removes its ledger entry. Whether deletion should exist at all is a policy
 * call about erasing financial history.
 */
/**
 * Recomputes the denormalised totals on a purchase order.
 *
 * `manifestId` is required and every statement filters on it. Without it this
 * summed every payment row pointing at the request whatever manifest it
 * belonged to, which is how a 1,000 payment in the sentinel manifest pushed a
 * Sales order to PAID. The final UPDATE is scoped too, so a request id from
 * another manifest cannot be written through this function at all.
 *
 * Note: sales_record_supplier_payment (migration 44) runs this same roll-up
 * inside the RPC and has the same missing filter — see migration 46.
 */
export async function updateProcurementFinancialTotals(manifestId: string, requestId: string) {
    // sales_procurement_request_items has no manifest_id of its own — it is
    // scoped through request_id — so there is nothing to filter here. The
    // UPDATE below is scoped, so a request from another manifest writes nothing
    // even though its lines were summed.
    const { data: items } = await supabase
        .from('sales_procurement_request_items')
        .select('expected_cost, quantity_ordered')
        .eq('request_id', requestId);
    const totalAmount = Math.round((items || []).reduce((sum, item) => sum + (Number(item.expected_cost) * Number(item.quantity_ordered)), 0));

    const { data: payments } = await supabase
        .from('sales_procurement_payments')
        .select('amount')
        .eq('manifest_id', manifestId)
        .eq('procurement_request_id', requestId);
    const amountPaid = Math.round((payments || []).reduce((sum, p) => sum + Number(p.amount), 0));

    const balanceDue = Math.max(0, totalAmount - amountPaid);
    let paymentStatus = 'UNPAID';
    if (amountPaid > 0 && balanceDue > 0) paymentStatus = 'PARTIAL';
    else if (balanceDue === 0 && totalAmount > 0) paymentStatus = 'PAID';
    else if (totalAmount === 0 && amountPaid === 0) paymentStatus = 'PAID';

    await supabase
        .from('sales_procurement_requests')
        .update({ total_amount: totalAmount, amount_paid: amountPaid, balance_due: balanceDue, payment_status: paymentStatus })
        .eq('manifest_id', manifestId)
        .eq('id', requestId);
}
