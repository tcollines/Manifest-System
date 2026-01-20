
import { Transaction, DepartmentRequest } from '../types';
import { supabase } from '../services/supabaseClient';
import { DEPARTMENT_REQUESTS } from '../constants';

const mapTransactionFromDB = (t: any): Transaction => ({
  id: t.id,
  type: t.type,
  category: t.category,
  amount: Number(t.amount),
  description: t.description,
  date: t.date,
  method: t.method,
  eventId: t.event_id
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
        const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching transactions:', error.message);
          return [];
        }
        return data.map(mapTransactionFromDB);
    } catch (e: any) {
        console.error('Unexpected error fetching transactions:', e.message || e);
        return [];
    }
  },

  addTransaction: async (transaction: Transaction): Promise<void> => {
    try {
        const { error } = await supabase.from('transactions').insert([{
            id: transaction.id,
            type: transaction.type,
            category: transaction.category,
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.date,
            method: transaction.method,
            event_id: transaction.eventId
        }]);
        if (error) console.error('Error adding transaction:', error.message);
    } catch (e: any) {
        console.error('Unexpected error adding transaction:', e.message || e);
    }
  },

  getRequests: async (): Promise<DepartmentRequest[]> => {
    try {
        const { data, error } = await supabase.from('department_requests').select('*');
        if (error) {
            console.error('Error fetching requests:', error.message);
            return DEPARTMENT_REQUESTS;
        }
        return data.map(mapRequestFromDB);
    } catch (e: any) {
        console.error('Unexpected error fetching requests:', e.message || e);
        return DEPARTMENT_REQUESTS;
    }
  },

  updateRequest: async (id: string, status: 'Approved' | 'Rejected'): Promise<void> => {
    try {
        const { error } = await supabase.from('department_requests').update({ status }).eq('id', id);
        if (error) console.error('Error updating request:', error.message);
    } catch (e: any) {
        console.error('Unexpected error updating request:', e.message || e);
    }
  }
};
