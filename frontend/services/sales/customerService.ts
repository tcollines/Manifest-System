import { apiFetch } from '../api';
import { SalesCustomer, SalesCustomerHistory } from '../../modules/sales/types';

export const customerService = {
  async getCustomers(manifestId: string): Promise<SalesCustomer[]> {
    const response = await apiFetch('/sales/customers');
    return response as SalesCustomer[];
  },

  async searchCustomers(manifestId: string, query: string): Promise<SalesCustomer[]> {
    const response = await apiFetch(`/sales/customers/search?q=${encodeURIComponent(query)}`);
    return response as SalesCustomer[];
  },

  async createCustomer(manifestId: string, payload: Partial<SalesCustomer>): Promise<SalesCustomer> {
    const response = await apiFetch('/sales/customers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return response as SalesCustomer;
  },

  async getCustomerHistory(customerId: string): Promise<SalesCustomerHistory> {
    const response = await apiFetch(`/sales/customers/${customerId}/history`);
    return response as SalesCustomerHistory;
  }
};
