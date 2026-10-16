import { apiFetch } from '../api';
import { ServiceResponse } from '../../types';

/**
 * Money accounts service.
 *
 * Returns ServiceResponse<T> as SERVICE_CONTRACTS.md section 1 requires, so
 * pages branch on status instead of wrapping every call in try/catch. The
 * backend replies with the SALES_* error already mapped to an HTTP status and a
 * plain message, so the message is surfaced as-is rather than replaced with a
 * generic one — "Cash has 88,000, needs 150,000" is the useful thing to show.
 *
 * Mapping is explicit, snake_case to camelCase, per section 3. Raw backend
 * objects are never handed to the UI.
 */

export interface MoneyAccount {
    id: string;
    name: string;
    accountType: 'CASH' | 'MOBILE_MONEY' | 'BANK';
    provider: string | null;
    accountNumber: string | null;
    openingBalance: number;
    openingBalanceDate: string;
    isActive: boolean;
    balance: number;
}

export interface AccountBalancesSummary {
    asOf: string | null;
    totalFunds: number;
    accounts: Array<{ id: string; name: string; accountType: string; isActive: boolean; balance: number }>;
}

export interface CashbookDay {
    date: string;
    openingBalance: number;
    salesIn: number;
    otherIn: number;
    transfersIn: number;
    totalIn: number;
    expensesOut: number;
    supplierPaymentsOut: number;
    refundsOut: number;
    otherOut: number;
    transfersOut: number;
    totalOut: number;
    closingBalance: number;
}

export interface Cashbook {
    account: { id: string; name: string; accountType: string; openingBalance: number; openingBalanceDate: string };
    period: { from: string; to: string; requestedFrom: string; clampedToOpeningDate: boolean };
    openingBalance: number;
    days: CashbookDay[];
    closingBalance: number;
    entryCount: number;
}

const mapAccount = (dto: any): MoneyAccount => ({
    id: dto.id,
    name: dto.name,
    accountType: dto.account_type,
    provider: dto.provider ?? null,
    accountNumber: dto.account_number ?? null,
    openingBalance: Number(dto.opening_balance ?? 0),
    openingBalanceDate: dto.opening_balance_date,
    isActive: Boolean(dto.is_active),
    balance: Number(dto.balance ?? 0)
});

/**
 * apiFetch already unwraps the backend's `{ error: "..." }` body into
 * Error.message, so the mapped SALES_* detail arrives intact — "Cash has
 * 88,000, needs 150,000" rather than a generic failure string. Pass it through.
 */
const toError = (e: any): { status: 'error'; message: string; error?: any } => ({
    status: 'error',
    message: typeof e?.message === 'string' && e.message.trim() ? e.message : 'Request failed',
    error: e
});

export const accountService = {
    async getAccounts(params: { asOf?: string; includeInactive?: boolean } = {}): Promise<ServiceResponse<MoneyAccount[]>> {
        try {
            const query = new URLSearchParams();
            if (params.asOf) query.set('asOf', params.asOf);
            if (params.includeInactive) query.set('includeInactive', 'true');
            const suffix = query.toString() ? `?${query}` : '';
            const data = await apiFetch(`/sales/accounts${suffix}`);
            return { status: 'success', data: (data || []).map(mapAccount) };
        } catch (e) { return toError(e); }
    },

    async getBalances(asOf?: string): Promise<ServiceResponse<AccountBalancesSummary>> {
        try {
            const suffix = asOf ? `?asOf=${encodeURIComponent(asOf)}` : '';
            const data = await apiFetch(`/sales/accounts/balances${suffix}`);
            return {
                status: 'success',
                data: {
                    asOf: data?.asOf ?? null,
                    totalFunds: Number(data?.totalFunds ?? 0),
                    accounts: (data?.accounts || []).map((a: any) => ({
                        id: a.id,
                        name: a.name,
                        accountType: a.accountType,
                        isActive: Boolean(a.isActive),
                        balance: Number(a.balance ?? 0)
                    }))
                }
            };
        } catch (e) { return toError(e); }
    },

    async getCashbook(accountId: string, range: { from?: string; to?: string } = {}): Promise<ServiceResponse<Cashbook>> {
        try {
            const query = new URLSearchParams();
            if (range.from) query.set('from', range.from);
            if (range.to) query.set('to', range.to);
            const suffix = query.toString() ? `?${query}` : '';
            const data = await apiFetch(`/sales/accounts/${accountId}/cashbook${suffix}`);
            return {
                status: 'success',
                data: {
                    account: data.account,
                    period: data.period,
                    openingBalance: Number(data.openingBalance ?? 0),
                    days: (data.days || []).map((d: any) => ({
                        date: d.date,
                        openingBalance: Number(d.openingBalance ?? 0),
                        salesIn: Number(d.salesIn ?? 0),
                        otherIn: Number(d.otherIn ?? 0),
                        transfersIn: Number(d.transfersIn ?? 0),
                        totalIn: Number(d.totalIn ?? 0),
                        expensesOut: Number(d.expensesOut ?? 0),
                        supplierPaymentsOut: Number(d.supplierPaymentsOut ?? 0),
                        refundsOut: Number(d.refundsOut ?? 0),
                        otherOut: Number(d.otherOut ?? 0),
                        transfersOut: Number(d.transfersOut ?? 0),
                        totalOut: Number(d.totalOut ?? 0),
                        closingBalance: Number(d.closingBalance ?? 0)
                    })),
                    closingBalance: Number(data.closingBalance ?? 0),
                    entryCount: Number(data.entryCount ?? 0)
                }
            };
        } catch (e) { return toError(e); }
    },

    async createAccount(input: {
        name: string;
        accountType: string;
        provider?: string | null;
        accountNumber?: string | null;
        openingBalance?: number;
        openingBalanceDate?: string;
    }): Promise<ServiceResponse<MoneyAccount>> {
        try {
            const res = await apiFetch('/sales/accounts', { method: 'POST', body: JSON.stringify(input) });
            return { status: 'success', data: mapAccount(res?.data ?? res) };
        } catch (e) { return toError(e); }
    },

    async updateAccount(id: string, updates: {
        name?: string;
        provider?: string | null;
        accountNumber?: string | null;
        openingBalance?: number;
        openingBalanceDate?: string;
        isActive?: boolean;
    }): Promise<ServiceResponse<MoneyAccount>> {
        try {
            const res = await apiFetch(`/sales/accounts/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
            return { status: 'success', data: mapAccount(res?.data ?? res) };
        } catch (e) { return toError(e); }
    }
};
