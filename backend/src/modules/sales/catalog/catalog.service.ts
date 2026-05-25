import { supabase } from '../../../supabase';
import { logAudit, computeChangedFields } from '../../../services/audit/auditService';

export const getCategories = async (manifestId: string) => {
    const { data, error } = await supabase.from('sales_categories').select('*').eq('manifest_id', manifestId);
    if (error) throw error;
    return data || [];
};

export const createCategory = async (manifestId: string, payload: any, auditContext: any) => {
    const { data, error } = await supabase
        .from('sales_categories')
        .insert([{ manifest_id: manifestId, ...payload }])
        .select()
        .single();
    
    if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
            throw new Error('A category with this name already exists.');
        }
        throw error;
    }

    logAudit({
        ...auditContext,
        actionType: 'CREATE_CATEGORY',
        moduleName: 'sales',
        entityName: 'sales_categories',
        entityId: data.id,
        afterValues: data
    });

    return data;
};

export const getProducts = async (manifestId: string) => {
    const { data, error } = await supabase.from('sales_products').select('*').eq('manifest_id', manifestId);
    if (error) throw error;
    return data || [];
};

export const createProduct = async (manifestId: string, payload: any, auditContext: any) => {
    const { data, error } = await supabase
        .from('sales_products')
        .insert([{ manifest_id: manifestId, ...payload }])
        .select()
        .single();
        
    if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
            throw new Error('A product with this name already exists.');
        }
        throw error;
    }

    logAudit({
        ...auditContext,
        actionType: 'CREATE_PRODUCT',
        moduleName: 'sales',
        entityName: 'sales_products',
        entityId: data.id,
        afterValues: data
    });

    return data;
};

export const getVariants = async (manifestId: string) => {
    const { data, error } = await supabase.from('sales_product_variants').select('*').eq('manifest_id', manifestId);
    if (error) throw error;
    return data || [];
};

export const createVariant = async (manifestId: string, payload: any, auditContext: any) => {
    const { data, error } = await supabase
        .from('sales_product_variants')
        .insert([{ manifest_id: manifestId, ...payload }])
        .select()
        .single();
        
    if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
            throw new Error('This SKU or Barcode is already in use. Please use a unique one.');
        }
        throw error;
    }

    logAudit({
        ...auditContext,
        actionType: 'CREATE_VARIANT',
        moduleName: 'sales',
        entityName: 'sales_product_variants',
        entityId: data.id,
        afterValues: data
    });

    return data;
};

export const updateVariantStock = async (manifestId: string, variantId: string, newStock: number, auditContext: any) => {
    // 1. Fetch before values
    const { data: beforeData, error: fetchErr } = await supabase
        .from('sales_product_variants')
        .select('*')
        .eq('id', variantId)
        .eq('manifest_id', manifestId)
        .single();
        
    if (fetchErr || !beforeData) throw new Error('Variant not found');

    // 2. Perform update
    const { data, error } = await supabase
        .from('sales_product_variants')
        .update({ stock_quantity: newStock })
        .eq('id', variantId)
        .eq('manifest_id', manifestId)
        .select()
        .single();
        
    if (error) throw error;

    // 3. Log audit
    logAudit({
        ...auditContext,
        actionType: 'UPDATE_VARIANT_STOCK',
        moduleName: 'sales',
        entityName: 'sales_product_variants',
        entityId: variantId,
        beforeValues: beforeData,
        afterValues: data,
        changedFields: computeChangedFields(beforeData, data)
    });

    return data;
};
