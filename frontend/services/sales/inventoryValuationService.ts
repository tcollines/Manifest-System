import { apiFetch } from '../api';

export const inventoryValuationService = {
  async getInventoryValuation(manifestId: string): Promise<any> {
    const data = await apiFetch('/sales/reports/inventory-valuation');
    return data;
  }
};
