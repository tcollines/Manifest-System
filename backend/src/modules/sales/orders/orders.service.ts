import { supabase } from '../../../supabase';
import { logAudit, computeChangedFields } from '../../../services/audit/auditService';

export const getOrders = async (manifestId: string) => {
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*, sales_customers(full_name)')
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

export const processCheckout = async (manifestId: string, orderPayload: any, items: any[], amountPaid: number, paymentMethod: string, auditContext: any) => {
    // 1. Validate Stock & Prepare Order
    const variantIds = items.map((i: any) => i.variant_id).filter(Boolean);
    const { data: variants, error: varErr } = await supabase.from('sales_product_variants').select('id, stock_quantity, reserved_quantity, cost_price, selling_price').in('id', variantIds);
    if (varErr) throw varErr;

    let totalAmount = 0;
    for (const item of items) {
        const variant = variants?.find((v: any) => v.id === item.variant_id);
        if (!variant) throw new Error(`Variant ${item.variant_id} not found`);
        const availableStock = Math.max(0, variant.stock_quantity - (variant.reserved_quantity || 0));
        if (item.quantity > availableStock) throw new Error(`Not enough stock for one of the items. Only ${availableStock} left.`);
        totalAmount += variant.selling_price * item.quantity;
    }

    const isFullyPaid = Number(amountPaid) >= totalAmount;
    const paymentStatus = isFullyPaid ? 'PAID' : (Number(amountPaid) > 0 ? 'PARTIAL' : 'UNPAID');
    const fulfillmentStatus = isFullyPaid ? 'COMPLETED' : 'PENDING';

    // 2. Create Order
    const { data: order, error: orderError } = await supabase.from('sales_orders').insert([{ 
        manifest_id: manifestId, ...orderPayload, total_amount: totalAmount, amount_paid: amountPaid, payment_status: paymentStatus, fulfillment_status: fulfillmentStatus 
    }]).select().single();
    if (orderError) throw orderError;

    // 3. Create Items
    const itemsPayload = items.map((item: any) => ({ ...item, order_id: order.id }));
    const { error: itemsError } = await supabase.from('sales_order_items').insert(itemsPayload);
    if (itemsError) throw itemsError;

    // 4. Record Payment
    let paymentRecord = null;
    if (Number(amountPaid) > 0) {
        const { data: pmt } = await supabase.from('sales_payments').insert([{ manifest_id: manifestId, order_id: order.id, amount: amountPaid, payment_method: paymentMethod, reference: 'POS Checkout' }]).select().single();
        paymentRecord = pmt;
    }

    // 5. Stock Update & Movements
    let movementsData = null;
    if (isFullyPaid) {
        const updatePromises = items.map(async (item: any) => {
            const variant = variants?.find((v: any) => v.id === item.variant_id);
            await supabase.from('sales_product_variants').update({ stock_quantity: Math.max(0, variant!.stock_quantity - item.quantity) }).eq('id', item.variant_id);
        });
        await Promise.all(updatePromises);

        const movements = items.map((item: any) => ({ manifest_id: manifestId, variant_id: item.variant_id, type: 'SALE', quantity: item.quantity, reason: 'POS completed', reference_id: order.id }));
        const { data: movs } = await supabase.from('sales_inventory_movements').insert(movements).select();
        movementsData = movs;
    } else if (Number(amountPaid) > 0) {
        const updatePromises = items.map(async (item: any) => {
            const variant = variants?.find((v: any) => v.id === item.variant_id);
            await supabase.from('sales_product_variants').update({ reserved_quantity: (variant!.reserved_quantity || 0) + item.quantity }).eq('id', item.variant_id);
        });
        await Promise.all(updatePromises);
        
        const movements = items.map((item: any) => ({ manifest_id: manifestId, variant_id: item.variant_id, type: 'RESERVATION', quantity: item.quantity, reason: 'POS partially paid', reference_id: order.id }));
        const { data: movs } = await supabase.from('sales_inventory_movements').insert(movements).select();
        movementsData = movs;
        await supabase.from('sales_orders').update({ fulfillment_status: 'RESERVED' }).eq('id', order.id);
    }

    // Log audit for Checkout
    await logAudit({
        ...auditContext,
        actionType: 'CHECKOUT_ORDER',
        moduleName: 'sales',
        entityName: 'sales_orders',
        entityId: order.id,
        afterValues: { 
            order, 
            items: itemsPayload, 
            payment: paymentRecord, 
            movements: movementsData 
        }
    });

    return order;
};
