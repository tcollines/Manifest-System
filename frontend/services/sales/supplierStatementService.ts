import { apiFetch } from '../api';
import { ServiceResponse } from '../../types';

/**
 * Supplier statement service.
 *
 * ServiceResponse<T> per SERVICE_CONTRACTS.md section 1, explicit mapping per
 * section 3. This endpoint already composes its own camelCase object rather
 * than returning table rows, but it is still mapped field by field — the UI
 * never receives a destructured backend response.
 *
 * `diagnostics` is not debug output and must reach the page.
 * `openingBalanceReceiptMissing` means credit exists with no matching debit, so
 * the ageing UNDERSTATES what is owed. A statement that quietly shows a wrong
 * ageing is exactly what that flag was added to prevent.
 */

export type StatementLineType = 'GOODS_RECEIPT' | 'PAYMENT';

export interface StatementLine {
    date: string;
    type: StatementLineType;
    reference: string | null;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

export interface SupplierAgeing {
    current: number;
    days31to60: number;
    days60Plus: number;
    total: number;
}

export interface StatementDiagnostics {
    goodsReceiptCount: number;
    paymentCount: number;
    paymentsNotLinkedToGoodsReceipt: number;
    unallocatedCredit: number;
    openingBalanceReceiptMissing: boolean;
}

export interface SupplierStatement {
    supplier: { id: string; name: string };
    period: { from: string | null; to: string | null; asOf: string };
    openingBalance: number;
    lines: StatementLine[];
    closingBalance: number;
    ageing: SupplierAgeing;
    diagnostics: StatementDiagnostics;
}

const mapLine = (dto: any): StatementLine => ({
    date: dto.date,
    type: dto.type,
    reference: dto.reference ?? null,
    description: dto.description,
    debit: Number(dto.debit ?? 0),
    credit: Number(dto.credit ?? 0),
    balance: Number(dto.balance ?? 0)
});

const mapStatement = (dto: any): SupplierStatement => ({
    supplier: { id: dto.supplier?.id, name: dto.supplier?.name },
    period: {
        from: dto.period?.from ?? null,
        to: dto.period?.to ?? null,
        asOf: dto.period?.asOf
    },
    openingBalance: Number(dto.openingBalance ?? 0),
    lines: (dto.lines || []).map(mapLine),
    closingBalance: Number(dto.closingBalance ?? 0),
    ageing: {
        current: Number(dto.ageing?.current ?? 0),
        days31to60: Number(dto.ageing?.days31to60 ?? 0),
        days60Plus: Number(dto.ageing?.days60Plus ?? 0),
        total: Number(dto.ageing?.total ?? 0)
    },
    diagnostics: {
        goodsReceiptCount: Number(dto.diagnostics?.goodsReceiptCount ?? 0),
        paymentCount: Number(dto.diagnostics?.paymentCount ?? 0),
        paymentsNotLinkedToGoodsReceipt: Number(dto.diagnostics?.paymentsNotLinkedToGoodsReceipt ?? 0),
        unallocatedCredit: Number(dto.diagnostics?.unallocatedCredit ?? 0),
        openingBalanceReceiptMissing: Boolean(dto.diagnostics?.openingBalanceReceiptMissing)
    }
});

const toError = (e: any): { status: 'error'; message: string; error?: any } => ({
    status: 'error',
    message: typeof e?.message === 'string' && e.message.trim() ? e.message : 'Request failed',
    error: e
});

export const supplierStatementService = {
    async getStatement(
        supplierId: string,
        range: { from?: string; to?: string } = {}
    ): Promise<ServiceResponse<SupplierStatement>> {
        try {
            const query = new URLSearchParams();
            if (range.from) query.set('from', range.from);
            if (range.to) query.set('to', range.to);
            const suffix = query.toString() ? `?${query}` : '';
            const data = await apiFetch(`/sales/procurement/suppliers/${supplierId}/statement${suffix}`);
            return { status: 'success', data: mapStatement(data) };
        } catch (e) { return toError(e); }
    }
};
