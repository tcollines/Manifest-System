import { apiFetch } from '../api';
import { SalesInventoryMovement, SalesStockTakingSession, SalesStockTakingItem } from '../../modules/sales/types';

export const inventoryService = {
  async getMovements(manifestId: string): Promise<SalesInventoryMovement[]> {
    const response = await apiFetch('/sales/inventory/movements');
    return response as SalesInventoryMovement[];
  },

  async recordMovement(manifestId: string, payload: Partial<SalesInventoryMovement>): Promise<void> {
    await apiFetch('/sales/inventory/movements', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getStockTakingSessions(manifestId: string): Promise<SalesStockTakingSession[]> {
    const response = await apiFetch('/sales/stock-taking/sessions');
    return response as SalesStockTakingSession[];
  },

  async startStockTakingSession(manifestId: string): Promise<SalesStockTakingSession> {
    const response = await apiFetch('/sales/stock-taking/sessions', {
      method: 'POST'
    });
    return response as SalesStockTakingSession;
  },

  async getStockTakingItems(sessionId: string): Promise<SalesStockTakingItem[]> {
    const response = await apiFetch(`/sales/stock-taking/sessions/${sessionId}/items`);
    return response as SalesStockTakingItem[];
  },

  async saveStockTakingItems(items: Partial<SalesStockTakingItem>[]): Promise<void> {
    await apiFetch('/sales/stock-taking/items', {
      method: 'POST',
      body: JSON.stringify({ items })
    });
  },

  async completeStockTakingSession(sessionId: string, items: any[]): Promise<void> {
    await apiFetch(`/sales/stock-taking/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ items })
    });
  },

  async deleteStockTakingSession(sessionId: string): Promise<void> {
    await apiFetch(`/sales/stock-taking/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }
};
