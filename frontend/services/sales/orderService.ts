import { apiFetch } from '../api';
import { SalesOrder, SalesOrderItem } from '../../modules/sales/types';

export const orderService = {
  async getOrders(manifestId: string): Promise<SalesOrder[]> {
    const response = await apiFetch('/sales/orders');
    return response as SalesOrder[];
  },

  async getOrderItems(orderId: string): Promise<SalesOrderItem[]> {
    const response = await apiFetch(`/sales/orders/${orderId}/items`);
    return response as SalesOrderItem[];
  },

  async createOrder(manifestId: string, payload: Partial<SalesOrder>, items: Partial<SalesOrderItem>[]): Promise<SalesOrder> {
    const response = await apiFetch('/sales/orders', {
      method: 'POST',
      body: JSON.stringify({ payload, items })
    });
    return response as SalesOrder;
  }
};
