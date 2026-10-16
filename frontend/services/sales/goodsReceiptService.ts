import { apiFetch } from '../api';
import { ServiceResponse } from '../../types';

/**
 * Goods receipts (GRNs) service.
 *
 * Returns ServiceResponse<T> as SERVICE_CONTRACTS.md section 1 requires, and
 * maps snake_case to camelCase explicitly per section 3 — the backend hands
 * back raw `sales_goods_receipts` rows with their Supabase joins attached, so
 * nothing here is passed through unmapped.
 *
 * The backend message is surfaced as-is: SALES_* errors already arrive mapped
 * to an HTTP status and a readable sentence, and that sentence is the useful
 * part.
 */

export type PaymentTerms = 'PAID' | 'CREDIT' | 'PART_PAID';

export interface GoodsReceiptItem {
    id: string;
    variantId: string;
    variantName: string | null;
    sku: string | null;
    quantity: number;
    unitCost: number;
    lineCost: number;
    procurementRequestItemId: string | null;
}

export interface GoodsReceipt {
    id: string;
    grnNumber: string;
    supplierId: string;
    supplierName: string | null;
    procurementRequestId: string | null;
    deliveryNoteNumber: string | null;
    receivedDate: string;
    paymentTerms: PaymentTerms;
    totalCost: number;
    /**
     * What has actually been paid against this receipt.
     *
     * The backend deliberately prefers the payment rows over
     * `amount_paid_on_receipt`, because the RPC writes the on-receipt payment
     * *as* a payment row — adding both double-counts. `amountPaidOnReceipt` is
     * carried for reference only; show `totalPaid` and `balance`, never a sum
     * of the two.
     */
    amountPaidOnReceipt: number;
    totalPaid: number;
    balance: number;
    notes: string | null;
    createdAt: string | null;
    createdBy: string | null;
    items: GoodsReceiptItem[];
}

const mapItem = (dto: any): GoodsReceiptItem => {
    const quantity = Number(dto.quantity ?? 0);
    const unitCost = Number(dto.unit_cost ?? 0);
    return {
        id: dto.id,
        variantId: dto.variant_id,
        variantName: dto.sales_product_variants?.name ?? null,
        sku: dto.sales_product_variants?.sku ?? null,
        quantity,
        unitCost,
        lineCost: quantity * unitCost,
        procurementRequestItemId: dto.procurement_request_item_id ?? null
    };
};

const mapReceipt = (dto: any): GoodsReceipt => ({
    id: dto.id,
    grnNumber: dto.grn_number,
    supplierId: dto.supplier_id,
    supplierName: dto.sales_suppliers?.name ?? null,
    procurementRequestId: dto.procurement_request_id ?? null,
    deliveryNoteNumber: dto.delivery_note_number ?? null,
    receivedDate: dto.received_date,
    paymentTerms: dto.payment_terms,
    totalCost: Number(dto.total_cost ?? 0),
    amountPaidOnReceipt: Number(dto.amount_paid_on_receipt ?? 0),
    totalPaid: Number(dto.total_paid ?? 0),
    balance: Number(dto.balance ?? 0),
    notes: dto.notes ?? null,
    createdAt: dto.created_at ?? null,
    createdBy: dto.created_by ?? null,
    items: (dto.sales_goods_receipt_items || []).map(mapItem)
});

const toError = (e: any): { status: 'error'; message: string; error?: any } => ({
    status: 'error',
    message: typeof e?.message === 'string' && e.message.trim() ? e.message : 'Request failed',
    error: e
});

export const goodsReceiptService = {
    /**
     * Lists goods receipts, newest first. `limit` is capped at 100 server-side;
     * asking for more is silently clamped rather than rejected.
     */
    async getGoodsReceipts(params: {
        supplierId?: string;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<ServiceResponse<GoodsReceipt[]>> {
        try {
            const query = new URLSearchParams();
            if (params.supplierId) query.set('supplierId', params.supplierId);
            if (params.from) query.set('from', params.from);
            if (params.to) query.set('to', params.to);
            if (params.page) query.set('page', String(params.page));
            if (params.limit) query.set('limit', String(params.limit));
            const suffix = query.toString() ? `?${query}` : '';
            const data = await apiFetch(`/sales/procurement/goods-receipts${suffix}`);
            return { status: 'success', data: (data || []).map(mapReceipt) };
        } catch (e) { return toError(e); }
    }
};
