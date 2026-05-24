import { supabase } from '../supabaseClient';
import { SalesCustomer, SalesCustomerHistory } from '../../modules/sales/types';

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

  async searchCustomers(manifestId: string, query: string): Promise<SalesCustomer[]> {
    const { data, error } = await supabase
      .from('sales_customers')
      .select('*')
      .eq('manifest_id', manifestId)
      .ilike('full_name', `%${query}%`)
      .order('full_name', { ascending: true })
      .limit(20);
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
  },

  async getCustomerHistory(customerId: string): Promise<SalesCustomerHistory> {
    const { data, error } = await supabase.rpc('get_customer_sales_history', {
      p_customer_id: customerId
    });
    if (error) throw error;
    return data as SalesCustomerHistory;
  }
};
