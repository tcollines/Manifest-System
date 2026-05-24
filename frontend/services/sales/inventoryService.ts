import { supabase } from '../supabaseClient';
import { SalesInventoryMovement, SalesStockTakingSession, SalesStockTakingItem } from '../../modules/sales/types';

export const inventoryService = {
  async getMovements(manifestId: string): Promise<SalesInventoryMovement[]> {
    const { data, error } = await supabase
      .from('sales_inventory_movements')
      .select('*')
      .eq('manifest_id', manifestId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async recordMovement(manifestId: string, payload: Partial<SalesInventoryMovement>): Promise<void> {
    const { error } = await supabase
      .from('sales_inventory_movements')
      .insert([{ manifest_id: manifestId, ...payload }]);
    if (error) throw error;
  },

  async getStockTakingSessions(manifestId: string): Promise<SalesStockTakingSession[]> {
    const { data, error } = await supabase
      .from('sales_stock_taking_sessions')
      .select('*')
      .eq('manifest_id', manifestId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async startStockTakingSession(manifestId: string): Promise<SalesStockTakingSession> {
    const { data, error } = await supabase
      .from('sales_stock_taking_sessions')
      .insert([{ manifest_id: manifestId, status: 'PENDING' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getStockTakingItems(sessionId: string): Promise<SalesStockTakingItem[]> {
    const { data, error } = await supabase
      .from('sales_stock_taking_items')
      .select('*, variant:variant_id(*)')
      .eq('session_id', sessionId);
    if (error) throw error;
    return data || [];
  },

  async saveStockTakingItems(items: Partial<SalesStockTakingItem>[]): Promise<void> {
    const { error } = await supabase
      .from('sales_stock_taking_items')
      .insert(items);
    if (error) throw error;
  },

  async completeStockTakingSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('sales_stock_taking_sessions')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw error;
  },

  async deleteStockTakingSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('sales_stock_taking_sessions')
      .delete()
      .eq('id', sessionId);
    if (error) throw error;
  }
};
