import { apiFetch } from '../api';
import { SalesOrder, SalesPaymentStatus, SalesFulfillmentStatus } from '../../modules/sales/types';

export const paymentService = {
  async recordPayment(manifestId: string, orderId: string, amount: number, paymentMethod: string, reference?: string): Promise<void> {
    await apiFetch('/sales/orders/payments', {
      method: 'POST',
      body: JSON.stringify({ orderId, amount, paymentMethod, reference })
    });
  },

  async processRefund(manifestId: string, orderId: string, refundAmount: number, reason: string): Promise<void> {
    await apiFetch('/sales/orders/refunds', {
      method: 'POST',
      body: JSON.stringify({ orderId, refundAmount, reason })
    });
  }
};
