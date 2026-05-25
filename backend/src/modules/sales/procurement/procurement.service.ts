import { supabase } from '../../../supabase';
import { logAudit, computeChangedFields } from '../../../services/audit/auditService';
import { updateProcurementFinancialTotals } from '../payments/payments.service';

export const getSuppliers = async (manifestId: string) => {
    const { data, error } = await supabase.from('sales_suppliers').select('*').eq('manifest_id', manifestId);
    if (error) throw error;
    return data || [];
};

export const createSupplier = async (manifestId: string, payload: any, auditContext: any) => {
    const { data, error } = await supabase.from('sales_suppliers').insert([{ manifest_id: manifestId, ...payload }]).select().single();
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'CREATE_SUPPLIER',
        moduleName: 'sales',
        entityName: 'sales_suppliers',
        entityId: data.id,
        afterValues: data
    });

    return data;
};

export const getProcurementRequests = async (manifestId: string) => {
    const { data, error } = await supabase.from('sales_procurement_requests').select('*, sales_suppliers(name)').eq('manifest_id', manifestId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getProcurementRequestItems = async (manifestId: string, requestId: string) => {
    const { data: request } = await supabase.from('sales_procurement_requests').select('id').eq('id', requestId).eq('manifest_id', manifestId).single();
    if (!request) throw new Error('Request not found');

    const { data, error } = await supabase.from('sales_procurement_request_items').select('*, sales_product_variants(*)').eq('request_id', requestId).order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const createRequestWithItems = async (manifestId: string, payload: any, auditContext: any) => {
    const { requestPayload, items } = payload;
    
    const { data: request, error: reqError } = await supabase.from('sales_procurement_requests').insert([{ manifest_id: manifestId, ...requestPayload, status: 'DRAFT' }]).select().single();
    if (reqError) throw reqError;

    const itemsToInsert = items.map((item: any) => ({ ...item, request_id: request.id }));
    const { error: itemsError } = await supabase.from('sales_procurement_request_items').insert(itemsToInsert);
    
    if (itemsError) {
        await supabase.from('sales_procurement_requests').delete().eq('id', request.id);
        throw itemsError;
    }

    logAudit({
        ...auditContext,
        actionType: 'CREATE_PROCUREMENT_REQUEST',
        moduleName: 'sales',
        entityName: 'sales_procurement_requests',
        entityId: request.id,
        afterValues: { ...request, itemsCount: items.length }
    });

    return request;
};

export const updateRequestStatus = async (manifestId: string, requestId: string, status: string, auditContext: any) => {
    const { data: beforeData } = await supabase.from('sales_procurement_requests').select('*').eq('id', requestId).eq('manifest_id', manifestId).single();

    const { data: request, error } = await supabase.from('sales_procurement_requests').update({ status }).eq('id', requestId).eq('manifest_id', manifestId).select().single();
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'UPDATE_PROCUREMENT_STATUS',
        moduleName: 'sales',
        entityName: 'sales_procurement_requests',
        entityId: requestId,
        beforeValues: beforeData,
        afterValues: request,
        changedFields: computeChangedFields(beforeData, request)
    });
};

export const deleteRequest = async (manifestId: string, requestId: string, auditContext: any) => {
    const { data: beforeData } = await supabase.from('sales_procurement_requests').select('*').eq('id', requestId).eq('manifest_id', manifestId).single();

    const { error } = await supabase.from('sales_procurement_requests').delete().eq('id', requestId).eq('manifest_id', manifestId);
    if (error) throw error;

    if (beforeData) {
        logAudit({
            ...auditContext,
            actionType: 'DELETE_PROCUREMENT_REQUEST',
            moduleName: 'sales',
            entityName: 'sales_procurement_requests',
            entityId: requestId,
            beforeValues: beforeData
        });
    }
};

export const updateRequestWithItems = async (manifestId: string, requestId: string, payload: any, auditContext: any) => {
    const { supplierId, items } = payload;
    
    const { data: beforeData } = await supabase.from('sales_procurement_requests').select('*').eq('id', requestId).eq('manifest_id', manifestId).single();

    const { error: reqError } = await supabase.from('sales_procurement_requests').update({ supplier_id: supplierId }).eq('id', requestId).eq('manifest_id', manifestId);
    if (reqError) throw reqError;

    const { error: delError } = await supabase.from('sales_procurement_request_items').delete().eq('request_id', requestId);
    if (delError) throw delError;

    const itemsToInsert = items.map((item: any) => ({ ...item, request_id: requestId }));
    const { error: insError } = await supabase.from('sales_procurement_request_items').insert(itemsToInsert);
    if (insError) throw insError;

    await updateProcurementFinancialTotals(requestId);

    const { data: afterData } = await supabase.from('sales_procurement_requests').select('*').eq('id', requestId).eq('manifest_id', manifestId).single();

    logAudit({
        ...auditContext,
        actionType: 'UPDATE_PROCUREMENT_REQUEST',
        moduleName: 'sales',
        entityName: 'sales_procurement_requests',
        entityId: requestId,
        beforeValues: beforeData,
        afterValues: afterData,
        changedFields: computeChangedFields(beforeData, afterData)
    });
};

export const receiveProcurementItem = async (manifestId: string, payload: any, auditContext: any) => {
    const { itemId, variantId, qtyReceivedNow, currentQtyReceived } = payload;
    
    // Perform all DB operations concurrently where possible
    const dbTasks = [];

    dbTasks.push(supabase.from('sales_procurement_request_items').update({ quantity_received: currentQtyReceived + qtyReceivedNow }).eq('id', itemId));

    // Must fetch variant sequentially to get current stock
    const { data: variant, error: varError } = await supabase.from('sales_product_variants').select('stock_quantity').eq('id', variantId).single();
    if (varError) throw varError;

    dbTasks.push(supabase.from('sales_product_variants').update({ stock_quantity: variant.stock_quantity + qtyReceivedNow }).eq('id', variantId));

    dbTasks.push(supabase.from('sales_inventory_movements').insert([{
        manifest_id: manifestId, variant_id: variantId, type: 'IN', quantity: qtyReceivedNow, reason: 'Procurement Receive', reference_id: itemId
    }]));

    const results = await Promise.all(dbTasks);
    for (const result of results) {
        if (result.error) throw result.error;
    }

    logAudit({
        ...auditContext,
        actionType: 'RECEIVE_PROCUREMENT_ITEM',
        moduleName: 'sales',
        entityName: 'sales_procurement_request_items',
        entityId: itemId,
        afterValues: { qtyReceivedNow, newTotalReceived: currentQtyReceived + qtyReceivedNow }
    });
};
