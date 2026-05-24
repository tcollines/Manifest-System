import { supabase } from '../supabaseClient';
import { SalesCategory, SalesProduct, SalesVariant } from '../../modules/sales/types';

export const salesService = {
  async getCategories(manifestId: string): Promise<SalesCategory[]> {
    const { data, error } = await supabase
      .from('sales_categories')
      .select('*')
      .eq('manifest_id', manifestId);
    if (error) throw error;
    return data || [];
  },

  async createCategory(manifestId: string, name: string, description?: string): Promise<SalesCategory> {
    const { data, error } = await supabase
      .from('sales_categories')
      .insert([{ manifest_id: manifestId, name, description }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getProducts(manifestId: string): Promise<SalesProduct[]> {
    const { data, error } = await supabase
      .from('sales_products')
      .select('*')
      .eq('manifest_id', manifestId);
    if (error) throw error;
    return data || [];
  },

  async createProduct(manifestId: string, categoryId: string, name: string, description?: string): Promise<SalesProduct> {
    const { data, error } = await supabase
      .from('sales_products')
      .insert([{ manifest_id: manifestId, category_id: categoryId, name, description }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getVariants(manifestId: string): Promise<SalesVariant[]> {
    const { data, error } = await supabase
      .from('sales_product_variants')
      .select('*')
      .eq('manifest_id', manifestId);
    if (error) throw error;
    return data || [];
  },

  async createVariant(manifestId: string, payload: Partial<SalesVariant>): Promise<SalesVariant> {
    const { data, error } = await supabase
      .from('sales_product_variants')
      .insert([{ manifest_id: manifestId, ...payload }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateVariantStock(variantId: string, newStock: number): Promise<void> {
    const { error } = await supabase
      .from('sales_product_variants')
      .update({ stock_quantity: newStock })
      .eq('id', variantId);
    if (error) throw error;
  }
};
