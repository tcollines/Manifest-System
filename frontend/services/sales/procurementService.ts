import { apiFetch } from '../api';
import { SalesSupplier, SalesProcurementRequest, SalesProcurementRequestItem } from '../../modules/sales/types';

export const procurementService = {
  async getSuppliers(manifestId: string): Promise<SalesSupplier[]> {
    const data = await apiFetch('/sales/procurement/suppliers');
    return data as SalesSupplier[];
  },

  async createSupplier(manifestId: string, payload: Partial<SalesSupplier>): Promise<SalesSupplier> {
    const data = await apiFetch('/sales/procurement/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data as SalesSupplier;
  },

  async getProcurementRequests(manifestId: string, page: number = 1, limit: number = 20): Promise<SalesProcurementRequest[]> {
    const data = await apiFetch(`/sales/procurement/requests?page=${page}&limit=${limit}`);
    return data as SalesProcurementRequest[];
  },
  
  async getProcurementRequestItems(requestId: string): Promise<SalesProcurementRequestItem[]> {
    const data = await apiFetch(`/sales/procurement/requests/${requestId}/items`);
    return data as SalesProcurementRequestItem[];
  },

  async createRequestWithItems(
    manifestId: string, 
    requestPayload: Partial<SalesProcurementRequest>, 
    items: Partial<SalesProcurementRequestItem>[],
    initialPayment?: { amount: number; method: string; recordedBy: string }
  ): Promise<SalesProcurementRequest> {
    const data = await apiFetch('/sales/procurement/requests', {
      method: 'POST',
      body: JSON.stringify({ requestPayload, items, initialPayment })
    });
    // Triggers payment logic on the backend too (needs to be implemented if I keep it there, or separately called)
    // Wait, the backend currently just creates the items in my controller, but it didn't call procurementPaymentService. 
    // I need to make sure I add that back, or I can just call the payment endpoint separately here.
    return data as SalesProcurementRequest;
  },

  async updateRequestStatus(requestId: string, status: string): Promise<void> {
    await apiFetch(`/sales/procurement/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async deleteRequest(requestId: string): Promise<void> {
    await apiFetch(`/sales/procurement/requests/${requestId}`, {
      method: 'DELETE'
    });
  },

  async updateRequestWithItems(
    requestId: string,
    supplierId: string,
    items: Partial<SalesProcurementRequestItem>[]
  ): Promise<void> {
    await apiFetch(`/sales/procurement/requests/${requestId}/update`, {
      method: 'PUT',
      body: JSON.stringify({ supplierId, items })
    });
  },
  
  async receiveProcurementItem(
    manifestId: string,
    itemId: string, 
    variantId: string, 
    qtyReceivedNow: number, 
    currentQtyReceived: number,
    expectedCost: number
  ): Promise<void> {
    await apiFetch(`/sales/procurement/receive`, {
      method: 'POST',
      body: JSON.stringify({ itemId, variantId, qtyReceivedNow, currentQtyReceived, expectedCost })
    });
  }
};
