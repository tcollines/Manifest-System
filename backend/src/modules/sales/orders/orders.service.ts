import { supabase } from '../../../supabase';
import { logAudit } from '../../../services/audit/auditService';
import { SALES_RPC } from '../shared/salesConstants';
import { parseOrThrow } from '../../../shared/validators/common';
import { ProcessCheckoutSchema } from '../../../shared/validators/salesSchemas';

export const getOrders = async (manifestId: string) => {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*, sales_customers(full_name), sales_order_items(quantity, sales_product_variants(name))')
        .eq('manifest_id', manifestId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getOrderItems = async (manifestId: string, orderId: string) => {
    const { data: order } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('id', orderId)
        .eq('manifest_id', manifestId)
        .single();
    if (!order) throw new Error('Order not found');

    const { data, error } = await supabase
        .from('sales_order_items')
        .select('*, sales_product_variants(*)')
        .eq('order_id', orderId);
    if (error) throw error;
    return data || [];
};

export const createOrder = async (manifestId: string, payload: any, items: any[], auditContext: any) => {
    let requiresProcurement = false;
    let procurementSupplierId = null;

    const variantIds = items.map((i: any) => i.variant_id).filter(Boolean);
    if (variantIds.length > 0) {
        const { data: variants } = await supabase
            .from('sales_product_variants')
            .select('id, stock_quantity, reserved_quantity, supplier_id')
            .in('id', variantIds);

        for (const item of items) {
            if (!item.variant_id) continue;
            const variant = variants?.find((v: any) => v.id === item.variant_id);
            if (variant) {
                const availableStock = Math.max(0, variant.stock_quantity - (variant.reserved_quantity || 0));
                if (item.quantity && item.quantity > availableStock) {
                    requiresProcurement = true;
                    procurementSupplierId = variant.supplier_id;
                }
            }
        }
    }

    const initialFulfillmentStatus = requiresProcurement ? 'WAITING_SUPPLIER' : 'PENDING';

    const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .insert([{ 
            manifest_id: manifestId, 
            ...payload, 
            fulfillment_status: initialFulfillmentStatus 
        }])
        .select()
        .single();
    if (orderError) throw orderError;

    const itemsPayload = items.map((item: any) => ({ ...item, order_id: order.id }));
    const { error: itemsError } = await supabase.from('sales_order_items').insert(itemsPayload);
    if (itemsError) throw itemsError;

    if (requiresProcurement && procurementSupplierId) {
         const { data: procReq, error: procError } = await supabase
             .from('sales_procurement_requests')
             .insert([{
                 manifest_id: manifestId,
                 order_id: order.id,
                 supplier_id: procurementSupplierId,
                 status: 'WAITING_SUPPLIER',
                 request_date: new Date().toISOString().split('T')[0]
             }])
             .select()
             .single();
             
         if (!procError && procReq) {
             await supabase.from('sales_orders')
                 .update({ procurement_request_id: procReq.id })
                 .eq('id', order.id);
         }
    }

    // Log audit
    await logAudit({
        ...auditContext,
        actionType: 'CREATE_ORDER',
        moduleName: 'sales',
        entityName: 'sales_orders',
        entityId: order.id,
        afterValues: { order, itemsPayload }
    });

    return order;
};

/**
 * POS checkout. Runs sales_process_checkout (migration 48) — one transaction
 * that prices the order from the locked variant rows, writes the order, its
 * items, the payment and the stock movements, and, when the order is paid in
 * full, the delivery the P&L recognises revenue from.
 *
 * This was thirty lines of service code doing the same work in seven separate
 * statements, and each of them was a hole:
 *
 *   - Stock was read, decremented in JavaScript and written back, so two
 *     concurrent sales of the last shirt both passed the availability test and
 *     both sold it. CLAUDE.md requires a SELECT ... FOR UPDATE, which only the
 *     RPC takes.
 *   - The payment row was inserted without an account_id and without checking
 *     the error, so a payment method the CHECK constraint refuses — the POS
 *     sends 'Mobile Money', which is not one of the six allowed values — was
 *     discarded in silence, leaving an order marked PAID with no payment
 *     behind it. Nothing in sales_account_ledger ever saw the money either.
 *   - A checkout that failed halfway left the order written and the stock not
 *     moved, or the reverse. There was no transaction.
 *   - And since migration 48, a completed sale must write a delivery row.
 *     Service code wrote none, so revenue recognised from deliveries would
 *     have started drifting from the orders on the very next sale.
 *
 * The RPC returns the ids and the resulting statuses; the order row itself is
 * no longer returned, because the caller only ever used it to learn what it
 * already knew.
 */
export const processCheckout = async (manifestId: string, payload: any, auditContext: any) => {
    const {
        items, amountPaid, accountId, paymentMethod, customerId, reference
    } = parseOrThrow(ProcessCheckoutSchema, payload);

    const createdBy = auditContext?.actorName ?? auditContext?.actorId ?? null;

    const { data, error } = await supabase.rpc(SALES_RPC.PROCESS_CHECKOUT, {
        p_manifest_id: manifestId,
        // The RPC reads variant_id and quantity and prices the line itself.
        p_items: items.map(item => ({ variant_id: item.variantId, quantity: item.quantity })),
        p_amount_paid: amountPaid,
        p_account_id: accountId ?? null,
        p_payment_method: paymentMethod ?? null,
        p_reference: reference ?? null,
        p_created_by: createdBy,
        // Only the columns a checkout may legitimately set. p_order_payload is
        // merged into the order row, so anything accepted here is a column the
        // client can write; created_by comes from the session, not the body.
        p_order_payload: { customer_id: customerId ?? null, created_by: createdBy }
    });
    if (error) throw error;

    await logAudit({
        ...auditContext,
        actionType: 'CHECKOUT_ORDER',
        moduleName: 'sales',
        entityName: 'sales_orders',
        entityId: data?.order_id,
        afterValues: {
            orderId: data?.order_id,
            customerId: customerId ?? null,
            items,
            totalAmount: data?.total_amount,
            amountPaid: data?.amount_paid,
            accountId: accountId ?? null,
            paymentMethod: paymentMethod ?? null,
            paymentStatus: data?.payment_status,
            fulfillmentStatus: data?.fulfillment_status,
            deliveryId: data?.delivery_id ?? null
        }
    });

    return data;
};
