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

  async updateCategory(categoryId: string, name: string, description?: string): Promise<SalesCategory> {
    const data = await apiFetch(`/sales/catalog/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description })
    });
    return data as SalesCategory;
  },

  async deleteCategory(categoryId: string): Promise<void> {
    await apiFetch(`/sales/catalog/categories/${categoryId}`, { method: 'DELETE' });
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

  async updateProduct(productId: string, categoryId: string, name: string, description?: string): Promise<SalesProduct> {
    const data = await apiFetch(`/sales/catalog/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ categoryId, name, description })
    });
    return data as SalesProduct;
  },

  async deleteProduct(productId: string): Promise<void> {
    await apiFetch(`/sales/catalog/products/${productId}`, { method: 'DELETE' });
  },

  async getVariants(manifestId: string, page: number = 1, limit: number = 20): Promise<SalesVariant[]> {
    const data = await apiFetch(`/sales/catalog/variants?page=${page}&limit=${limit}`);
    return data as SalesVariant[];
  },

  async createVariant(manifestId: string, payload: Partial<SalesVariant>): Promise<SalesVariant> {
    const data = await apiFetch('/sales/catalog/variants', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data as SalesVariant;
  },

  async updateVariant(variantId: string, payload: Partial<SalesVariant>): Promise<SalesVariant> {
    const data = await apiFetch(`/sales/catalog/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return data as SalesVariant;
  },

  async deleteVariant(variantId: string): Promise<void> {
    await apiFetch(`/sales/catalog/variants/${variantId}`, { method: 'DELETE' });
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
