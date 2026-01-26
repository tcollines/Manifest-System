
import { Transaction, DepartmentRequest } from '../types';
import { apiFetch } from '../services/api';
import { DEPARTMENT_REQUESTS } from '../constants';

const mapTransactionFromDB = (t: any): Transaction => ({
  id: t.id,
  type: t.type,
  category: t.category,
  amount: Number(t.amount),
  description: t.description,
  date: t.date,
  method: t.method,
  eventId: t.event_id ? String(t.event_id) : undefined
});

const mapRequestFromDB = (r: any): DepartmentRequest => ({
  id: r.id,
  department: r.department,
  requester: r.requester,
  amount: r.amount,
  reason: r.reason,
  date: r.date,
  status: r.status
});

export const FinanceStore = {
  getTransactions: async (): Promise<Transaction[]> => {
    try {
      const data = await apiFetch('/finance/transactions');
      return data.map(mapTransactionFromDB);
    } catch (e: any) {
      console.error('Unexpected error fetching transactions:', e.message || e);
      return [];
    }
  },

  addTransaction: async (transaction: Transaction): Promise<void> => {
    try {
      await apiFetch('/finance/transactions', {
        method: 'POST',
        body: JSON.stringify({
          id: transaction.id,
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date,
          method: transaction.method,
          event_id: transaction.eventId
        })
      });
    } catch (e: any) {
      console.error('Unexpected error adding transaction:', e.message || e);
    }
  },

  getRequests: async (): Promise<DepartmentRequest[]> => {
    try {
      const data = await apiFetch('/finance/requests');
      if (!data) return DEPARTMENT_REQUESTS;
      return data.map(mapRequestFromDB);
    } catch (e: any) {
      console.error('Unexpected error fetching requests:', e.message || e);
      return DEPARTMENT_REQUESTS;
    }
  },

  updateRequest: async (id: string, status: 'Approved' | 'Rejected'): Promise<void> => {
    try {
      await apiFetch(`/finance/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    } catch (e: any) {
      console.error('Unexpected error updating request:', e.message || e);
    }
  }
};
