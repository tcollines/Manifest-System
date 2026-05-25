import { apiFetch } from '../api';

export const fulfillmentService = {
  async reserveOrderStock(manifestId: string, orderId: string): Promise<void> {
    // Reservation is now handled by the backend automatically when payment is recorded,
    // but if we ever need to manually reserve, we can expose an endpoint.
    console.warn('reserveOrderStock called from frontend. This is now handled by backend payments logic.');
  },

  async fulfillOrder(manifestId: string, orderId: string): Promise<void> {
    await apiFetch('/sales/orders/fulfill', {
      method: 'POST',
      body: JSON.stringify({ orderId })
    });
  },

  async releaseReservation(manifestId: string, orderId: string, reason: string): Promise<void> {
    // Handled by the backend refund logic, but if needed:
    console.warn('releaseReservation called from frontend. Handled natively via backend refund logic.');
  }
};
