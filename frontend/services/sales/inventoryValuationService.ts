import { supabase } from '../supabaseClient';

export const inventoryValuationService = {
  async getInventoryValuation(manifestId: string): Promise<any> {
    const { data: variants, error } = await supabase
      .from('sales_product_variants')
      .select(`
        id,
        name,
        sku,
        cost_price,
        selling_price,
        stock_quantity,
        sales_products (
          name
        )
      `)
      .eq('manifest_id', manifestId)
      .eq('is_active', true);

    if (error) throw error;

    let totalCostValue = 0;
    let totalRetailValue = 0;

    const items = variants?.map((v: any) => {
      const qty = Number(v.stock_quantity);
      const cost = Number(v.cost_price);
      const retail = Number(v.selling_price);

      const costValue = qty * cost;
      const retailValue = qty * retail;

      totalCostValue += costValue;
      totalRetailValue += retailValue;

      return {
        id: v.id,
        productName: v.sales_products?.name || 'Unknown Product',
        variantName: v.name,
        sku: v.sku,
        stockQuantity: qty,
        costPrice: cost,
        sellingPrice: retail,
        inventoryCostValue: costValue,
        inventoryRetailValue: retailValue
      };
    }) || [];

    return {
      items,
      totalCostValue,
      totalRetailValue
    };
  }
};
