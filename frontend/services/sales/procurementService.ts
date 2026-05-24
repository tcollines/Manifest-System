import { supabase } from '../supabaseClient';
import { SalesSupplier, SalesProcurementRequest } from '../../modules/sales/types';

export const procurementService = {
  async getSuppliers(manifestId: string): Promise<SalesSupplier[]> {
    const { data, error } = await supabase
      .from('sales_suppliers')
      .select('*')
      .eq('manifest_id', manifestId);
    if (error) throw error;
    return data || [];
  },

  async createSupplier(manifestId: string, payload: Partial<SalesSupplier>): Promise<SalesSupplier> {
    const { data, error } = await supabase
      .from('sales_suppliers')
      .insert([{ manifest_id: manifestId, ...payload }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getProcurementRequests(manifestId: string): Promise<SalesProcurementRequest[]> {
    const { data, error } = await supabase
      .from('sales_procurement_requests')
      .select('*, sales_suppliers(name), sales_orders(id)')
      .eq('manifest_id', manifestId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createRequest(manifestId: string, payload: Partial<SalesProcurementRequest>): Promise<SalesProcurementRequest> {
    const { data, error } = await supabase
      .from('sales_procurement_requests')
      .insert([{ manifest_id: manifestId, ...payload }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateRequestStatus(requestId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('sales_procurement_requests')
      .update({ status })
      .eq('id', requestId);
    if (error) throw error;
  }
};
