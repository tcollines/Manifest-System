import { apiFetch } from '../api';
import { ServiceResponse } from '../../types';
import { SalesProcurementPayment, SalesProcurementRequest } from '../../modules/sales/types';

/**
 * Supplier payments.
 *
 * `recordSupplierPayment` posts to /sales/procurement/suppliers/:id/payments,
 * which runs the sales_record_supplier_payment RPC (migration 44). That route
 * is the only one that writes `account_id`, and `account_id` is what makes a
 * payment visible: sales_account_ledger (migration 40) selects procurement
 * payments `WHERE account_id IS NOT NULL`. It also takes SELECT ... FOR UPDATE
 * on the account row and runs the overdraft check, so two concurrent payments
 * cannot each pass a balance test the other invalidates.
 *
 * The previous `recordPayment` here posted to /sales/procurement/payments,
 * which inserts the row directly with no account at all. Every payment made
 * through it left the supplier ledger correct and the cash position overstated.
 * It is gone rather than deprecated so nothing wires itself back to it.
 *
 * Editing and deleting run the migration-47 RPCs, which lock the order and both
 * accounts, re-test sufficiency against only what changes, and recompute the
 * order totals in the same transaction.
 *
 * The three write methods return ServiceResponse per SERVICE_CONTRACTS section
 * 1. The read methods still throw; they are on the legacy shape and are left
 * alone rather than half-converted.
 */

export interface SupplierPaymentResult {
    paymentId: string;
    supplierId: string;
    amount: number;
    paymentDate: string;
    accountId: string;
    accountBalance: number;
    procurementRequestId: string | null;
    /** Null when the payment named no purchase order — a payment on account. */
    requestBalanceDue: number | null;
}

export interface RecordSupplierPaymentInput {
    amount: number;
    accountId: string;
    paymentMethod: string;
    paymentDate?: string;
    goodsReceiptId?: string;
    procurementRequestId?: string;
    reference?: string;
    notes?: string;
}

/**
 * Editing deliberately omits goodsReceiptId and procurementRequestId: which
 * document a payment settles is not editable. The schema is `.strict()`, so
 * sending one is a 422 naming the field rather than a silent no-op.
 */
export interface UpdateSupplierPaymentInput {
    amount: number;
    accountId: string;
    paymentMethod: string;
    paymentDate?: string;
    reference?: string;
    notes?: string;
}

/**
 * The backend replies with the SALES_* error already mapped to an HTTP status
 * and a plain message — "Cash has 88,000, needs 150,000" — and apiFetch puts it
 * on Error.message. Surface it as-is; a generic "Failed to save" would throw
 * away the only useful part.
 */
const toError = (e: any): { status: 'error'; message: string; error?: any } => ({
    status: 'error',
    message: typeof e?.message === 'string' && e.message.trim() ? e.message : 'Request failed',
    error: e
});

/** All three RPCs return the same jsonb shape, so one mapper serves them. */
const mapPaymentResult = (dto: any): SupplierPaymentResult => ({
    paymentId: dto.payment_id,
    supplierId: dto.supplier_id,
    amount: Number(dto.amount ?? 0),
    paymentDate: dto.payment_date,
    accountId: dto.account_id,
    accountBalance: Number(dto.account_balance ?? 0),
    procurementRequestId: dto.procurement_request_id ?? null,
    requestBalanceDue:
        dto.request_balance_due === null || dto.request_balance_due === undefined
            ? null
            : Number(dto.request_balance_due)
});

export const procurementPaymentService = {
    async getPaymentsForRequest(requestId: string): Promise<SalesProcurementPayment[]> {
        const data = await apiFetch(`/sales/procurement/requests/${requestId}/payments`);
        return data as SalesProcurementPayment[];
    },

    async recordSupplierPayment(
        supplierId: string,
        input: RecordSupplierPaymentInput
    ): Promise<ServiceResponse<SupplierPaymentResult>> {
        try {
            // The schema is .strict(): an unrecognised key is a 422 naming the
            // key, so only the fields it declares are sent. Optional fields are
            // omitted when blank rather than sent as '' — an empty string is not
            // a valid date or uuid.
            const body: Record<string, unknown> = {
                amount: input.amount,
                accountId: input.accountId,
                paymentMethod: input.paymentMethod
            };
            if (input.paymentDate) body.paymentDate = input.paymentDate;
            if (input.goodsReceiptId) body.goodsReceiptId = input.goodsReceiptId;
            if (input.procurementRequestId) body.procurementRequestId = input.procurementRequestId;
            if (input.reference?.trim()) body.reference = input.reference.trim();
            if (input.notes?.trim()) body.notes = input.notes.trim();

            const res = await apiFetch(`/sales/procurement/suppliers/${supplierId}/payments`, {
                method: 'POST',
                body: JSON.stringify(body)
            });
            return { status: 'success', data: mapPaymentResult(res?.data ?? res) };
        } catch (e) { return toError(e); }
    },

    /**
     * Edits an existing payment. Amount, account and method are always sent —
     * the RPC replaces them outright rather than merging, so a partial payload
     * would be a half-specified money change.
     *
     * Supplier and purchase order are not editable. To move a payment to a
     * different document, delete it and record it again.
     */
    async updateSupplierPayment(
        paymentId: string,
        input: UpdateSupplierPaymentInput
    ): Promise<ServiceResponse<SupplierPaymentResult>> {
        try {
            const body: Record<string, unknown> = {
                amount: input.amount,
                accountId: input.accountId,
                paymentMethod: input.paymentMethod
            };
            if (input.paymentDate) body.paymentDate = input.paymentDate;
            if (input.reference?.trim()) body.reference = input.reference.trim();
            if (input.notes?.trim()) body.notes = input.notes.trim();

            const res = await apiFetch(`/sales/procurement/payments/${paymentId}`, {
                method: 'PUT',
                body: JSON.stringify(body)
            });
            return { status: 'success', data: mapPaymentResult(res?.data ?? res) };
        } catch (e) { return toError(e); }
    },

    /**
     * Deletes a payment. The account balance rises again by the amount on its
     * own — sales_account_ledger is a view summed live, so the row is the
     * ledger entry. The full row is written to the audit log first.
     */
    async deleteSupplierPayment(paymentId: string): Promise<ServiceResponse<SupplierPaymentResult>> {
        try {
            const res = await apiFetch(`/sales/procurement/payments/${paymentId}`, { method: 'DELETE' });
            return { status: 'success', data: mapPaymentResult(res?.data ?? res) };
        } catch (e) { return toError(e); }
    },

    async updateProcurementFinancialTotals(requestId: string): Promise<SalesProcurementRequest> {
        // Now strictly handled by the backend whenever a payment is added.
        console.warn('updateProcurementFinancialTotals called. Automatically handled by backend routes.');
        const data = await apiFetch(`/sales/procurement/requests`);
        const req = (data as SalesProcurementRequest[]).find(r => r.id === requestId);
        return req as SalesProcurementRequest;
    }
};
