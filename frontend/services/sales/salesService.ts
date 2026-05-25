import { apiFetch } from '../api';
import { SalesCategory, SalesProduct, SalesVariant } from '../../modules/sales/types';

export const salesService = {
  async getCategories(manifestId: string): Promise<SalesCategory[]> {
    const data = await apiFetch('/sales/catalog/categories');
    return data as SalesCategory[];
  },

  async createCategory(manifestId: string, name: string, description?: string): Promise<SalesCategory> {
    const data = await apiFetch('/sales/catalog/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
    return data as SalesCategory;
  },

  async getProducts(manifestId: string): Promise<SalesProduct[]> {
    const data = await apiFetch('/sales/catalog/products');
    return data as SalesProduct[];
  },

  async createProduct(manifestId: string, categoryId: string, name: string, description?: string): Promise<SalesProduct> {
    const data = await apiFetch('/sales/catalog/products', {
      method: 'POST',
      body: JSON.stringify({ categoryId, name, description })
    });
    return data as SalesProduct;
  },

  async getVariants(manifestId: string): Promise<SalesVariant[]> {
    const data = await apiFetch('/sales/catalog/variants');
    return data as SalesVariant[];
  },

  async createVariant(manifestId: string, payload: Partial<SalesVariant>): Promise<SalesVariant> {
    const data = await apiFetch('/sales/catalog/variants', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data as SalesVariant;
  },

  async updateVariantStock(variantId: string, newStock: number): Promise<void> {
    await apiFetch(`/sales/catalog/variants/${variantId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ newStock })
    });
  },

  async processCheckout(manifestId: string, payload: any): Promise<any> {
    const data = await apiFetch('/sales/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data;
  }
};
