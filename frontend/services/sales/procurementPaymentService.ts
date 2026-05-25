import { apiFetch } from '../api';
import { SalesProcurementPayment, SalesProcurementRequest } from '../../modules/sales/types';

export const procurementPaymentService = {
  async getPaymentsForRequest(requestId: string): Promise<SalesProcurementPayment[]> {
    const data = await apiFetch(`/sales/procurement/requests/${requestId}/payments`);
    return data as SalesProcurementPayment[];
  },

  async recordPayment(
    manifestId: string,
    requestId: string,
    supplierId: string,
    amount: number,
    paymentMethod: string,
    recordedBy: string,
    transactionReference?: string,
    notes?: string
  ): Promise<SalesProcurementPayment> {
    const data = await apiFetch('/sales/procurement/payments', {
      method: 'POST',
      body: JSON.stringify({ requestId, supplierId, amount, paymentMethod, recordedBy, transactionReference, notes })
    });
    return data as SalesProcurementPayment;
  },

  async deletePayment(paymentId: string, requestId: string): Promise<void> {
    await apiFetch(`/sales/procurement/payments/${paymentId}/requests/${requestId}`, {
      method: 'DELETE'
    });
  },

  async updateProcurementFinancialTotals(requestId: string): Promise<SalesProcurementRequest> {
     // Now strictly handled by the backend whenever a payment is added/deleted.
     console.warn('updateProcurementFinancialTotals called. Automatically handled by backend routes.');
     const data = await apiFetch(`/sales/procurement/requests`);
     const req = (data as SalesProcurementRequest[]).find(r => r.id === requestId);
     return req as SalesProcurementRequest;
  }
};
