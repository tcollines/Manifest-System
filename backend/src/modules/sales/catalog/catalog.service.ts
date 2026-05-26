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

export const updateCategory = async (manifestId: string, categoryId: string, payload: any, auditContext: any) => {
    const { data: beforeData, error: fetchErr } = await supabase.from('sales_categories').select('*').eq('id', categoryId).eq('manifest_id', manifestId).single();
    if (fetchErr || !beforeData) throw new Error('Category not found');

    const { data, error } = await supabase.from('sales_categories').update(payload).eq('id', categoryId).eq('manifest_id', manifestId).select().single();
    if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key')) throw new Error('A category with this name already exists.');
        throw error;
    }

    logAudit({ ...auditContext, actionType: 'UPDATE_CATEGORY', moduleName: 'sales', entityName: 'sales_categories', entityId: categoryId, beforeValues: beforeData, afterValues: data, changedFields: computeChangedFields(beforeData, data) });
    return data;
};

export const deleteCategory = async (manifestId: string, categoryId: string, auditContext: any) => {
    const { data: beforeData, error: fetchErr } = await supabase.from('sales_categories').select('*').eq('id', categoryId).eq('manifest_id', manifestId).single();
    if (fetchErr || !beforeData) throw new Error('Category not found');

    const { error } = await supabase.from('sales_categories').delete().eq('id', categoryId).eq('manifest_id', manifestId);
    if (error) {
        if (error.code === '23503') throw new Error('Cannot delete this category because it contains products.');
        throw error;
    }

    logAudit({ ...auditContext, actionType: 'DELETE_CATEGORY', moduleName: 'sales', entityName: 'sales_categories', entityId: categoryId, beforeValues: beforeData });
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

export const updateProduct = async (manifestId: string, productId: string, payload: any, auditContext: any) => {
    const { data: beforeData, error: fetchErr } = await supabase.from('sales_products').select('*').eq('id', productId).eq('manifest_id', manifestId).single();
    if (fetchErr || !beforeData) throw new Error('Product not found');

    const { data, error } = await supabase.from('sales_products').update(payload).eq('id', productId).eq('manifest_id', manifestId).select().single();
    if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key')) throw new Error('A product with this name already exists.');
        throw error;
    }

    logAudit({ ...auditContext, actionType: 'UPDATE_PRODUCT', moduleName: 'sales', entityName: 'sales_products', entityId: productId, beforeValues: beforeData, afterValues: data, changedFields: computeChangedFields(beforeData, data) });
    return data;
};

export const deleteProduct = async (manifestId: string, productId: string, auditContext: any) => {
    const { data: beforeData, error: fetchErr } = await supabase.from('sales_products').select('*').eq('id', productId).eq('manifest_id', manifestId).single();
    if (fetchErr || !beforeData) throw new Error('Product not found');

    const { error } = await supabase.from('sales_products').delete().eq('id', productId).eq('manifest_id', manifestId);
    if (error) {
        if (error.code === '23503') throw new Error('Cannot delete this product because it has variants.');
        throw error;
    }

    logAudit({ ...auditContext, actionType: 'DELETE_PRODUCT', moduleName: 'sales', entityName: 'sales_products', entityId: productId, beforeValues: beforeData });
};

export const getVariants = async (manifestId: string, page: number = 1, limit: number = 20) => {
    const offset = (page - 1) * limit;
    const { data, error } = await supabase
        .from('sales_product_variants')
        .select('*, sales_products(name, description)')
        .eq('manifest_id', manifestId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
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

export const updateVariant = async (manifestId: string, variantId: string, payload: any, auditContext: any) => {
    const { data: beforeData, error: fetchErr } = await supabase.from('sales_product_variants').select('*').eq('id', variantId).eq('manifest_id', manifestId).single();
    if (fetchErr || !beforeData) throw new Error('Variant not found');

    const { data, error } = await supabase.from('sales_product_variants').update(payload).eq('id', variantId).eq('manifest_id', manifestId).select().single();
    if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key')) throw new Error('This SKU or Barcode is already in use.');
        throw error;
    }

    logAudit({ ...auditContext, actionType: 'UPDATE_VARIANT', moduleName: 'sales', entityName: 'sales_product_variants', entityId: variantId, beforeValues: beforeData, afterValues: data, changedFields: computeChangedFields(beforeData, data) });
    return data;
};

export const deleteVariant = async (manifestId: string, variantId: string, auditContext: any) => {
    const { data: beforeData, error: fetchErr } = await supabase.from('sales_product_variants').select('*').eq('id', variantId).eq('manifest_id', manifestId).single();
    if (fetchErr || !beforeData) throw new Error('Variant not found');

    const { error } = await supabase.from('sales_product_variants').delete().eq('id', variantId).eq('manifest_id', manifestId);
    if (error) {
        if (error.code === '23503') throw new Error('Cannot delete this variant because it has associated sales, orders, or stock movements.');
        throw error;
    }

    logAudit({ ...auditContext, actionType: 'DELETE_VARIANT', moduleName: 'sales', entityName: 'sales_product_variants', entityId: variantId, beforeValues: beforeData });
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
