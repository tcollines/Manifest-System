import { DeptFinanceEntry, ServiceResponse } from '../types';
import { apiFetch } from '../services/api';
import { safeFetch } from '../services/safeFetch';

const mapEntry = (d: any): DeptFinanceEntry => ({
    id:             d.id,
    manifestId:     d.manifest_id,
    departmentId:   d.department_id,
    type:           d.type,
    category:       d.category,
    amount:         typeof d.amount === 'string' ? parseFloat(d.amount) : d.amount,
    description:    d.description,
    date:           d.date,
    recordedBy:     d.recorded_by,
    createdAt:      d.created_at,
    recordedByName: d.recorded_by_name,
});

export interface DeptFinanceSummary {
    totalIncome:  number;
    totalExpense: number;
    netBalance:   number;
}

export const DeptFinanceStore = {
    /** Fetch all entries for a department, optionally filtered by month (YYYY-MM) */
    getByDepartment: async (
        deptId: string,
        month?: string,
    ): Promise<ServiceResponse<DeptFinanceEntry[]>> =>
        safeFetch(
            () => apiFetch(`/departments/${deptId}/finances${month ? `?month=${month}` : ''}`),
            'Failed to fetch department finances',
            (data) => (Array.isArray(data) ? data : []).map(mapEntry),
        ),

    /** Add an income or expense entry */
    add: async (payload: {
        departmentId: string;
        type: 'Income' | 'Expense';
        amount: number;
        description: string;
        date: string;
    }): Promise<ServiceResponse<DeptFinanceEntry>> =>
        safeFetch(
            () => apiFetch(`/departments/${payload.departmentId}/finances`, {
                method: 'POST',
                body: JSON.stringify(payload),
            }),
            'Failed to add finance entry',
            mapEntry,
        ),

    /** Update an income or expense entry */
    update: async (payload: {
        departmentId: string;
        entryId: string;
        type: 'Income' | 'Expense';
        amount: number;
        description: string;
        date: string;
    }): Promise<ServiceResponse<DeptFinanceEntry>> =>
        safeFetch(
            () => apiFetch(`/departments/${payload.departmentId}/finances/${payload.entryId}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            }),
            'Failed to update finance entry',
            mapEntry,
        ),

    /** Delete a finance entry */
    delete: async (deptId: string, entryId: string): Promise<ServiceResponse<null>> =>
        safeFetch(
            () => apiFetch(`/departments/${deptId}/finances/${entryId}`, { method: 'DELETE' }),
            'Failed to delete entry',
        ),

    /**
     * Compute income/expense/balance summary client-side from a list of entries.
     * Call after getByDepartment() and derive KPIs without an extra API call.
     */
    getSummary: (entries: DeptFinanceEntry[]): DeptFinanceSummary => {
        const totals = entries.reduce(
            (acc, e) => {
                if (e.type === 'Income')  acc.totalIncome  += e.amount;
                else                      acc.totalExpense += e.amount;
                return acc;
            },
            { totalIncome: 0, totalExpense: 0, netBalance: 0 },
        );
        totals.netBalance = totals.totalIncome - totals.totalExpense;
        return totals;
    },
};
