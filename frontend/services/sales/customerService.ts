import { supabase } from '../supabaseClient';
import { SalesCustomer } from '../../modules/sales/types';

export const customerService = {
  async getCustomers(manifestId: string): Promise<SalesCustomer[]> {
    const { data, error } = await supabase
      .from('sales_customers')
      .select('*')
      .eq('manifest_id', manifestId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createCustomer(manifestId: string, payload: Partial<SalesCustomer>): Promise<SalesCustomer> {
    const { data, error } = await supabase
      .from('sales_customers')
      .insert([{ manifest_id: manifestId, ...payload }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
