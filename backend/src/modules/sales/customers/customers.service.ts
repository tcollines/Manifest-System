import { supabase } from '../../../supabase';
import { logAudit, computeChangedFields } from '../../../services/audit/auditService';

export const getCustomers = async (manifestId: string) => {
    const { data, error } = await supabase
        .from('sales_customers')
        .select('*')
        .eq('manifest_id', manifestId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const searchCustomers = async (manifestId: string, query: string) => {
    const { data, error } = await supabase
        .from('sales_customers')
        .select('*')
        .eq('manifest_id', manifestId)
        .ilike('full_name', `%${query}%`)
        .order('full_name', { ascending: true })
        .limit(20);
    if (error) throw error;
    return data || [];
};

export const createCustomer = async (manifestId: string, payload: any, auditContext: any) => {
    const { data, error } = await supabase
        .from('sales_customers')
        .insert([{ manifest_id: manifestId, ...payload }])
        .select()
        .single();
    if (error) throw error;

    // Log audit
    await logAudit({
        ...auditContext,
        actionType: 'CREATE_CUSTOMER',
        moduleName: 'sales',
        entityName: 'sales_customers',
        entityId: data.id,
        afterValues: data
    });

    return data;
};

export const updateCustomer = async (manifestId: string, customerId: string, payload: any, auditContext: any) => {
    // 1. Fetch before values
    const { data: beforeData, error: fetchErr } = await supabase
        .from('sales_customers')
        .select('*')
        .eq('id', customerId)
        .eq('manifest_id', manifestId)
        .single();
        
    if (fetchErr || !beforeData) {
        throw new Error('Customer not found');
    }

    // 2. Perform update
    const { data, error } = await supabase
        .from('sales_customers')
        .update(payload)
        .eq('id', customerId)
        .eq('manifest_id', manifestId)
        .select()
        .single();
    if (error) throw error;

    // 3. Log audit
    await logAudit({
        ...auditContext,
        actionType: 'UPDATE_CUSTOMER',
        moduleName: 'sales',
        entityName: 'sales_customers',
        entityId: data.id,
        beforeValues: beforeData,
        afterValues: data,
        changedFields: computeChangedFields(beforeData, data)
    });

    return data;
};

export const getCustomerHistory = async (manifestId: string, customerId: string) => {
    const { data: customer, error: customerErr } = await supabase
        .from('sales_customers')
        .select('id')
        .eq('id', customerId)
        .eq('manifest_id', manifestId)
        .single();

    if (customerErr || !customer) throw new Error('Customer not found');

    const { data, error } = await supabase.rpc('get_customer_sales_history', {
        p_customer_id: customerId
    });
    if (error) throw error;
    return data;
};

export const deleteCustomer = async (manifestId: string, customerId: string, auditContext: any) => {
    // 1. Fetch before values to keep a record of what was deleted
    const { data: beforeData, error: fetchErr } = await supabase
        .from('sales_customers')
        .select('*')
        .eq('id', customerId)
        .eq('manifest_id', manifestId)
        .single();
        
    if (fetchErr || !beforeData) {
        throw new Error('Customer not found');
    }

    // 2. Perform deletion
    const { error } = await supabase
        .from('sales_customers')
        .delete()
        .eq('id', customerId)
        .eq('manifest_id', manifestId);
    if (error) throw error;

    // 3. Log audit
    await logAudit({
        ...auditContext,
        actionType: 'DELETE_CUSTOMER',
        moduleName: 'sales',
        entityName: 'sales_customers',
        entityId: customerId,
        beforeValues: beforeData
    });
};
