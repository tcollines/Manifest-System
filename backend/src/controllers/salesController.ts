import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { validateTenant, validateRole, handleApiError } from '../utils/supabaseHelper';
import { sendSuccess, sendError } from '../shared/responses';

// ==========================================
// CUSTOMERS
// ==========================================

export const getCustomers = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const { data, error } = await supabase
            .from('sales_customers')
            .select('*')
            .eq('manifest_id', manifestId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        sendSuccess(res, data || []);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch customers');
    }
};

export const searchCustomers = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    const query = req.query.q as string || '';

    try {
        const { data, error } = await supabase
            .from('sales_customers')
            .select('*')
            .eq('manifest_id', manifestId)
            .ilike('full_name', `%${query}%`)
            .order('full_name', { ascending: true })
            .limit(20);

        if (error) throw error;
        sendSuccess(res, data || []);
    } catch (err) {
        handleApiError(res, err, 'Failed to search customers');
    }
};

export const createCustomer = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const { data, error } = await supabase
            .from('sales_customers')
            .insert([{ manifest_id: manifestId, ...req.body }])
            .select()
            .single();

        if (error) throw error;
        sendSuccess(res, data, 201);
    } catch (err) {
        handleApiError(res, err, 'Failed to create customer');
    }
};

export const getCustomerHistory = async (req: Request, res: Response) => {
    // Note: get_customer_sales_history is an RPC, we just pass the ID.
    // Tenant validation should ideally happen inside the RPC or we verify ownership first.
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    
    const customerId = req.params.id;

    try {
        // Optional: verify customer belongs to manifestId
        const { data: customer, error: customerErr } = await supabase
            .from('sales_customers')
            .select('id')
            .eq('id', customerId)
            .eq('manifest_id', manifestId)
            .single();

        if (customerErr || !customer) {
            return sendError(res, 'Customer not found', 404);
        }

        const { data, error } = await supabase.rpc('get_customer_sales_history', {
            p_customer_id: customerId
        });

        if (error) throw error;
        sendSuccess(res, data);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch customer history');
    }
};

export const deleteCustomer = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    // RBAC: Only ADMIN or HOD can delete customers
    if (!validateRole(req, res, ['ADMIN', 'HOD'])) return;

    try {
        const { error } = await supabase
            .from('sales_customers')
            .delete()
            .eq('id', req.params.id)
            .eq('manifest_id', manifestId);

        if (error) throw error;
        sendSuccess(res, { success: true });
    } catch (err) {
        handleApiError(res, err, 'Failed to delete customer');
    }
};

// ==========================================
// ORDERS
// ==========================================

export const getOrders = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    try {
        const { data, error } = await supabase
            .from('sales_orders')
            .select('*, sales_customers(full_name)')
            .eq('manifest_id', manifestId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        sendSuccess(res, data || []);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch orders');
    }
};

export const getOrderItems = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        // Ideally verify order belongs to tenant, but order_items doesn't have manifest_id.
        // We do a join or just trust the order_id if it's a UUID, but secure way is:
        const { data: order } = await supabase
            .from('sales_orders')
            .select('id')
            .eq('id', req.params.id)
            .eq('manifest_id', manifestId)
            .single();

        if (!order) return sendError(res, 'Order not found', 404);

        const { data, error } = await supabase
            .from('sales_order_items')
            .select('*, sales_product_variants(*)')
            .eq('order_id', req.params.id);

        if (error) throw error;
        sendSuccess(res, data || []);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch order items');
    }
};

export const createOrder = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    const { payload, items } = req.body;
    
    try {
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
                const variant = variants?.find(v => v.id === item.variant_id);
                
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
        const { error: itemsError } = await supabase
            .from('sales_order_items')
            .insert(itemsPayload);
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

        sendSuccess(res, order, 201);
    } catch (err) {
        handleApiError(res, err, 'Failed to create order');
    }
};

export const processCheckout = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    const { orderPayload, items, amountPaid, paymentMethod } = req.body;
    
    try {
        // 1. Validate Stock & Prepare Order
        const variantIds = items.map((i: any) => i.variant_id).filter(Boolean);
        const { data: variants, error: varErr } = await supabase.from('sales_product_variants').select('id, stock_quantity, reserved_quantity, cost_price, selling_price').in('id', variantIds);
        if (varErr) throw varErr;

        let totalAmount = 0;
        for (const item of items) {
            const variant = variants?.find(v => v.id === item.variant_id);
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
        if (Number(amountPaid) > 0) {
            await supabase.from('sales_payments').insert([{ manifest_id: manifestId, order_id: order.id, amount: amountPaid, payment_method: paymentMethod, reference: 'POS Checkout' }]);
        }

        // 5. Stock Update & Movements (Only if fully paid & fulfilled instantly)
        if (isFullyPaid) {
            const updatePromises = items.map(async (item: any) => {
                const variant = variants?.find(v => v.id === item.variant_id);
                await supabase.from('sales_product_variants').update({ stock_quantity: Math.max(0, variant!.stock_quantity - item.quantity) }).eq('id', item.variant_id);
            });
            await Promise.all(updatePromises);

            const movements = items.map((item: any) => ({ manifest_id: manifestId, variant_id: item.variant_id, type: 'SALE', quantity: item.quantity, reason: 'POS completed', reference_id: order.id }));
            await supabase.from('sales_inventory_movements').insert(movements);
        } else if (Number(amountPaid) > 0) {
            // Partially paid -> reserve stock
            const updatePromises = items.map(async (item: any) => {
                const variant = variants?.find(v => v.id === item.variant_id);
                await supabase.from('sales_product_variants').update({ reserved_quantity: (variant!.reserved_quantity || 0) + item.quantity }).eq('id', item.variant_id);
            });
            await Promise.all(updatePromises);
            
            const movements = items.map((item: any) => ({ manifest_id: manifestId, variant_id: item.variant_id, type: 'RESERVATION', quantity: item.quantity, reason: 'POS partially paid', reference_id: order.id }));
            await supabase.from('sales_inventory_movements').insert(movements);
            await supabase.from('sales_orders').update({ fulfillment_status: 'RESERVED' }).eq('id', order.id);
        }

        sendSuccess(res, order, 201);
    } catch (err) {
        handleApiError(res, err, 'Failed to process checkout');
    }
};

// ==========================================
// INVENTORY & STOCK TAKING
// ==========================================

export const getMovements = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const { data, error } = await supabase
            .from('sales_inventory_movements')
            .select('*')
            .eq('manifest_id', manifestId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        sendSuccess(res, data || []);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch inventory movements');
    }
};

export const recordMovement = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    if (!validateRole(req, res, ['ADMIN', 'HOD', 'STAFF'])) return;

    try {
        const { error } = await supabase
            .from('sales_inventory_movements')
            .insert([{ manifest_id: manifestId, ...req.body }]);
        if (error) throw error;
        sendSuccess(res, { success: true }, 201);
    } catch (err) {
        handleApiError(res, err, 'Failed to record movement');
    }
};

export const getStockTakingSessions = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        const { data, error } = await supabase
            .from('sales_stock_taking_sessions')
            .select('*')
            .eq('manifest_id', manifestId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        sendSuccess(res, data || []);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch stock taking sessions');
    }
};

export const startStockTakingSession = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const { data, error } = await supabase
            .from('sales_stock_taking_sessions')
            .insert([{ manifest_id: manifestId, status: 'PENDING' }])
            .select()
            .single();
        if (error) throw error;
        sendSuccess(res, data, 201);
    } catch (err) {
        handleApiError(res, err, 'Failed to start stock taking session');
    }
};

export const getStockTakingItems = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;
    try {
        // Enforce tenant isolation via session ownership
        const { data: session } = await supabase
            .from('sales_stock_taking_sessions')
            .select('id')
            .eq('id', req.params.id)
            .eq('manifest_id', manifestId)
            .single();

        if (!session) return sendError(res, 'Session not found', 404);

        const { data, error } = await supabase
            .from('sales_stock_taking_items')
            .select('*, variant:variant_id(*)')
            .eq('session_id', req.params.id);
        if (error) throw error;
        sendSuccess(res, data || []);
    } catch (err) {
        handleApiError(res, err, 'Failed to fetch stock taking items');
    }
};

export const saveStockTakingItems = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const { items } = req.body;
        // The frontend doesn't strictly inject manifest_id into stock taking items in the past,
        // but let's ensure we do safe insert.
        const { error } = await supabase
            .from('sales_stock_taking_items')
            .insert(items);
        if (error) throw error;
        sendSuccess(res, { success: true }, 201);
    } catch (err) {
        handleApiError(res, err, 'Failed to save items');
    }
};

export const completeStockTakingSession = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    try {
        const { error } = await supabase
            .from('sales_stock_taking_sessions')
            .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('manifest_id', manifestId);
        if (error) throw error;
        sendSuccess(res, { success: true });
    } catch (err) {
        handleApiError(res, err, 'Failed to complete session');
    }
};

export const deleteStockTakingSession = async (req: Request, res: Response) => {
    const manifestId = validateTenant(req, res);
    if (!manifestId) return;

    if (!validateRole(req, res, ['ADMIN', 'HOD'])) return;

    try {
        const { error } = await supabase
            .from('sales_stock_taking_sessions')
            .delete()
            .eq('id', req.params.id)
            .eq('manifest_id', manifestId);
        if (error) throw error;
        sendSuccess(res, { success: true });
    } catch (err) {
        handleApiError(res, err, 'Failed to delete session');
    }
};
