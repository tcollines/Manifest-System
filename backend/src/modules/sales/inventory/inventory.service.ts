import { supabase } from '../../../supabase';
import { logAudit, computeChangedFields } from '../../../services/audit/auditService';

export const getMovements = async (manifestId: string) => {
    const { data, error } = await supabase
        .from('sales_inventory_movements')
        .select('*')
        .eq('manifest_id', manifestId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const recordMovement = async (manifestId: string, payload: any, auditContext: any) => {
    const { data, error } = await supabase
        .from('sales_inventory_movements')
        .insert([{ manifest_id: manifestId, ...payload }])
        .select()
        .single();
    if (error) throw error;

    await logAudit({
        ...auditContext,
        actionType: 'RECORD_INVENTORY_MOVEMENT',
        moduleName: 'sales',
        entityName: 'sales_inventory_movements',
        entityId: data.id,
        afterValues: data
    });

    return data;
};

export const getStockTakingSessions = async (manifestId: string) => {
    const { data, error } = await supabase
        .from('sales_stock_taking_sessions')
        .select('*')
        .eq('manifest_id', manifestId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const startStockTakingSession = async (manifestId: string, auditContext: any) => {
    const { data, error } = await supabase
        .from('sales_stock_taking_sessions')
        .insert([{ manifest_id: manifestId, status: 'PENDING' }])
        .select()
        .single();
    if (error) throw error;

    await logAudit({
        ...auditContext,
        actionType: 'START_STOCK_TAKING_SESSION',
        moduleName: 'sales',
        entityName: 'sales_stock_taking_sessions',
        entityId: data.id,
        afterValues: data
    });

    return data;
};

export const getStockTakingItems = async (manifestId: string, sessionId: string) => {
    const { data: session } = await supabase
        .from('sales_stock_taking_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('manifest_id', manifestId)
        .single();
    if (!session) throw new Error('Session not found');

    const { data, error } = await supabase
        .from('sales_stock_taking_items')
        .select('*, variant:variant_id(*)')
        .eq('session_id', sessionId);
    if (error) throw error;
    return data || [];
};

export const saveStockTakingItems = async (manifestId: string, items: any[], auditContext: any) => {
    const { data, error } = await supabase
        .from('sales_stock_taking_items')
        .insert(items)
        .select();
    if (error) throw error;

    await logAudit({
        ...auditContext,
        actionType: 'SAVE_STOCK_TAKING_ITEMS',
        moduleName: 'sales',
        entityName: 'sales_stock_taking_items',
        afterValues: { itemsCount: items.length }
    });
};

export const completeStockTakingSession = async (manifestId: string, sessionId: string, items: any[], auditContext: any) => {
    // 1. Fetch before values (must be sequential to check if it exists)
    const { data: beforeData, error: fetchErr } = await supabase
        .from('sales_stock_taking_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('manifest_id', manifestId)
        .single();
    if (fetchErr || !beforeData) throw new Error('Session not found');

    const dbTasks = [];

    // 2. Insert items
    if (items && items.length > 0) {
        dbTasks.push(supabase.from('sales_stock_taking_items').insert(items));
        
        // 3. Update variants and record movements
        const movementsToInsert = [];
        
        for (const item of items) {
            if (item.variance !== 0) {
                dbTasks.push(
                    supabase.from('sales_product_variants')
                        .update({ stock_quantity: item.physical_quantity })
                        .eq('id', item.variant_id)
                        .eq('manifest_id', manifestId)
                );
                
                movementsToInsert.push({
                    manifest_id: manifestId,
                    variant_id: item.variant_id,
                    type: 'ADJUSTMENT',
                    quantity: item.variance,
                    reason: 'Stock Take',
                    reference_id: sessionId
                });
            }
        }
        
        if (movementsToInsert.length > 0) {
            dbTasks.push(supabase.from('sales_inventory_movements').insert(movementsToInsert));
        }
    }

    // 4. Perform completion
    dbTasks.push(
        supabase.from('sales_stock_taking_sessions')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('manifest_id', manifestId)
    );

    // Execute all database writes concurrently!
    await Promise.all(dbTasks);

    // Log Audit non-blocking
    logAudit({
        ...auditContext,
        actionType: 'COMPLETE_STOCK_TAKING_SESSION',
        moduleName: 'sales',
        entityName: 'sales_stock_taking_sessions',
        entityId: sessionId,
        beforeValues: beforeData,
        afterValues: { status: 'COMPLETED' },
        changedFields: ['status', 'completed_at']
    });
};

export const deleteStockTakingSession = async (manifestId: string, sessionId: string, auditContext: any) => {
    // 1. Fetch before values
    const { data: beforeData, error: fetchErr } = await supabase
        .from('sales_stock_taking_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('manifest_id', manifestId)
        .single();
    if (fetchErr || !beforeData) throw new Error('Session not found');

    // 2. Perform deletion
    const { error } = await supabase
        .from('sales_stock_taking_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('manifest_id', manifestId);
    if (error) throw error;

    await logAudit({
        ...auditContext,
        actionType: 'DELETE_STOCK_TAKING_SESSION',
        moduleName: 'sales',
        entityName: 'sales_stock_taking_sessions',
        entityId: sessionId,
        beforeValues: beforeData
    });
};
