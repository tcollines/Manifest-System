import { supabase } from '../../../supabase';
import { logAudit, computeChangedFields } from '../../../services/audit/auditService';
import { updateProcurementFinancialTotals } from '../payments/payments.service';
import { SalesRequestError } from '../shared/salesErrors';
import {
    GOODS_RECEIPT_TERMS, GOODS_RECEIPT_TERMS_VALUES, PAYMENT_METHOD_VALUES, SALES_RPC,
    isUuidV4, isPositiveInteger, isNonNegativeInteger, isIsoDate
} from '../shared/salesConstants';
import { parseOrThrow } from '../../../shared/validators/common';
import {
    CreateGoodsReceiptSchema, RecordSupplierPaymentSchema, UpdateSupplierPaymentSchema
} from '../../../shared/validators/salesSchemas';

export const getSuppliers = async (manifestId: string) => {
    const { data, error } = await supabase.from('sales_suppliers').select('*').eq('manifest_id', manifestId);
    if (error) throw error;
    return data || [];
};

export const createSupplier = async (manifestId: string, payload: any, auditContext: any) => {
    const { data, error } = await supabase.from('sales_suppliers').insert([{ manifest_id: manifestId, ...payload }]).select().single();
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'CREATE_SUPPLIER',
        moduleName: 'sales',
        entityName: 'sales_suppliers',
        entityId: data.id,
        afterValues: data
    });

    return data;
};

export const getProcurementRequests = async (manifestId: string, page: number = 1, limit: number = 20) => {
    const offset = (page - 1) * limit;
    const { data, error } = await supabase
        .from('sales_procurement_requests')
        .select('*, sales_suppliers(name)')
        .eq('manifest_id', manifestId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
};

export const getProcurementRequestItems = async (manifestId: string, requestId: string) => {
    const { data: request } = await supabase.from('sales_procurement_requests').select('id').eq('id', requestId).eq('manifest_id', manifestId).single();
    if (!request) throw new Error('Request not found');

    const { data, error } = await supabase.from('sales_procurement_request_items').select('*, sales_product_variants(*)').eq('request_id', requestId).order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
};

/**
 * Creates a purchase order and its lines.
 *
 * This used to accept an `initialPayment` and hand it to
 * recordProcurementPayment, which wrote a payment row with no account_id — the
 * order was created and the money silently never left any account. Creating the
 * order and paying it are now two calls: post the payment to
 * /procurement/suppliers/:id/payments, which names the account and runs the
 * RPC. An `initialPayment` key in the body is ignored rather than honoured.
 */
export const createRequestWithItems = async (manifestId: string, payload: any, auditContext: any) => {
    const { requestPayload, items } = payload;

    const { data: request, error: reqError } = await supabase.from('sales_procurement_requests').insert([{ manifest_id: manifestId, ...requestPayload, status: 'DRAFT' }]).select().single();
    if (reqError) throw reqError;

    const itemsToInsert = items.map((item: any) => ({ ...item, request_id: request.id }));
    const { error: itemsError } = await supabase.from('sales_procurement_request_items').insert(itemsToInsert);
    
    if (itemsError) {
        await supabase.from('sales_procurement_requests').delete().eq('id', request.id);
        throw itemsError;
    }

    await updateProcurementFinancialTotals(manifestId, request.id);

    logAudit({
        ...auditContext,
        actionType: 'CREATE_PROCUREMENT_REQUEST',
        moduleName: 'sales',
        entityName: 'sales_procurement_requests',
        entityId: request.id,
        afterValues: { ...request, itemsCount: items.length }
    });

    return request;
};

export const updateRequestStatus = async (manifestId: string, requestId: string, status: string, auditContext: any) => {
    const { data: beforeData } = await supabase.from('sales_procurement_requests').select('*').eq('id', requestId).eq('manifest_id', manifestId).single();

    const { data: request, error } = await supabase.from('sales_procurement_requests').update({ status }).eq('id', requestId).eq('manifest_id', manifestId).select().single();
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'UPDATE_PROCUREMENT_STATUS',
        moduleName: 'sales',
        entityName: 'sales_procurement_requests',
        entityId: requestId,
        beforeValues: beforeData,
        afterValues: request,
        changedFields: computeChangedFields(beforeData, request)
    });
};

export const deleteRequest = async (manifestId: string, requestId: string, auditContext: any) => {
    const { data: beforeData } = await supabase.from('sales_procurement_requests').select('*').eq('id', requestId).eq('manifest_id', manifestId).single();

    const { error } = await supabase.from('sales_procurement_requests').delete().eq('id', requestId).eq('manifest_id', manifestId);
    if (error) throw error;

    if (beforeData) {
        logAudit({
            ...auditContext,
            actionType: 'DELETE_PROCUREMENT_REQUEST',
            moduleName: 'sales',
            entityName: 'sales_procurement_requests',
            entityId: requestId,
            beforeValues: beforeData
        });
    }
};

export const updateRequestWithItems = async (manifestId: string, requestId: string, payload: any, auditContext: any) => {
    const { supplierId, items } = payload;
    
    const { data: beforeData } = await supabase.from('sales_procurement_requests').select('*').eq('id', requestId).eq('manifest_id', manifestId).single();

    const { error: reqError } = await supabase.from('sales_procurement_requests').update({ supplier_id: supplierId }).eq('id', requestId).eq('manifest_id', manifestId);
    if (reqError) throw reqError;

    const { error: delError } = await supabase.from('sales_procurement_request_items').delete().eq('request_id', requestId);
    if (delError) throw delError;

    const itemsToInsert = items.map((item: any) => ({ ...item, request_id: requestId }));
    const { error: insError } = await supabase.from('sales_procurement_request_items').insert(itemsToInsert);
    if (insError) throw insError;

    await updateProcurementFinancialTotals(manifestId, requestId);

    const { data: afterData } = await supabase.from('sales_procurement_requests').select('*').eq('id', requestId).eq('manifest_id', manifestId).single();

    logAudit({
        ...auditContext,
        actionType: 'UPDATE_PROCUREMENT_REQUEST',
        moduleName: 'sales',
        entityName: 'sales_procurement_requests',
        entityId: requestId,
        beforeValues: beforeData,
        afterValues: afterData,
        changedFields: computeChangedFields(beforeData, afterData)
    });
};

/**
 * Lists goods receipts, newest first, with their lines and supplier.
 *
 * `balance` is what is still owed on each receipt: total_cost less what was
 * paid when it was received, less any supplier payment booked against it since.
 */
export const getGoodsReceipts = async (
    manifestId: string,
    filters: { supplierId?: string; from?: string; to?: string; page?: number; limit?: number } = {}
) => {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const offset = (page - 1) * limit;

    if (filters.supplierId !== undefined && !isUuidV4(filters.supplierId)) {
        throw SalesRequestError.validation('supplierId', 'Must be a valid v4 UUID');
    }
    if (filters.from !== undefined && !isIsoDate(filters.from)) {
        throw SalesRequestError.validation('from', 'Must be a calendar date as YYYY-MM-DD');
    }
    if (filters.to !== undefined && !isIsoDate(filters.to)) {
        throw SalesRequestError.validation('to', 'Must be a calendar date as YYYY-MM-DD');
    }

    let query = supabase
        .from('sales_goods_receipts')
        .select('*, sales_suppliers(name), sales_goods_receipt_items(*, sales_product_variants(name, sku))')
        .eq('manifest_id', manifestId);

    if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);
    if (filters.from) query = query.gte('received_date', filters.from);
    if (filters.to) query = query.lte('received_date', filters.to);

    const { data, error } = await query
        .order('received_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) throw error;

    const receipts = data || [];
    if (receipts.length === 0) return [];

    // Payments booked against these receipts after the fact.
    const { data: payments, error: paymentsError } = await supabase
        .from('sales_procurement_payments')
        .select('goods_receipt_id, amount')
        .eq('manifest_id', manifestId)
        .in('goods_receipt_id', receipts.map((r: any) => r.id));
    if (paymentsError) throw paymentsError;

    const paidByReceipt = new Map<string, number>();
    for (const payment of payments || []) {
        if (!payment.goods_receipt_id) continue;
        paidByReceipt.set(
            payment.goods_receipt_id,
            (paidByReceipt.get(payment.goods_receipt_id) || 0) + Number(payment.amount)
        );
    }

    return receipts.map((receipt: any) => {
        const totalCost = Number(receipt.total_cost);
        // amount_paid_on_receipt is itself written as a payment row by the RPC,
        // so counting both would double it. The payment rows are authoritative.
        const paid = paidByReceipt.get(receipt.id) ?? Number(receipt.amount_paid_on_receipt);
        return { ...receipt, total_paid: paid, balance: totalCost - paid };
    });
};

/** Kampala has no DST, so a fixed +03:00 shift is exact. */
const KAMPALA_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Converts a timestamptz to the calendar date it fell on in Africa/Kampala. */
const toKampalaDate = (timestamp: string): string =>
    new Date(new Date(timestamp).getTime() + KAMPALA_OFFSET_MS).toISOString().slice(0, 10);

const daysBetween = (from: string, to: string): number =>
    Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export interface AgeingReceipt { id: string; date: string; amount: number }
export interface AgeingPayment { date: string; amount: number; goodsReceiptId: string | null }
export interface SupplierAgeing {
    ageing: { current: number; days31to60: number; days60Plus: number; total: number };
    unallocatedCredit: number;
}

/**
 * Ages a supplier's outstanding goods receipts as at `asOf`.
 *
 * ALLOCATION RULE — the plan does not specify one, so this is chosen and
 * applied consistently: a payment carrying a goodsReceiptId settles that
 * receipt first, then any remainder settles the oldest outstanding receipt
 * first (FIFO). Ageing brackets follow that allocation. Change the rule here
 * and the brackets change with it.
 *
 * Credit that cannot be matched to any receipt is returned as
 * `unallocatedCredit` rather than being discarded or driving a bracket
 * negative. Before the cut-over creates opening-balance receipts, historical
 * payments land here — which is the signal that ageing understates the debt.
 *
 * Pure, so the arithmetic can be tested without a database.
 */
export const computeSupplierAgeing = (
    receipts: AgeingReceipt[],
    payments: AgeingPayment[],
    asOf: string
): SupplierAgeing => {
    const outstanding = receipts
        .filter(r => r.date <= asOf)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        .map(r => ({ ...r, remaining: r.amount }));
    const byId = new Map(outstanding.map(r => [r.id, r]));

    let unallocatedCredit = 0;
    for (const payment of payments.filter(p => p.date <= asOf)) {
        let left = payment.amount;

        const target = payment.goodsReceiptId ? byId.get(payment.goodsReceiptId) : undefined;
        if (target) {
            const applied = Math.min(left, target.remaining);
            target.remaining -= applied;
            left -= applied;
        }

        for (const receipt of outstanding) {
            if (left <= 0) break;
            const applied = Math.min(left, receipt.remaining);
            receipt.remaining -= applied;
            left -= applied;
        }

        unallocatedCredit += left;
    }

    const ageing = { current: 0, days31to60: 0, days60Plus: 0, total: 0 };
    for (const receipt of outstanding) {
        if (receipt.remaining <= 0) continue;
        const age = daysBetween(receipt.date, asOf);
        if (age <= 30) ageing.current += receipt.remaining;
        else if (age <= 60) ageing.days31to60 += receipt.remaining;
        else ageing.days60Plus += receipt.remaining;
        ageing.total += receipt.remaining;
    }

    return { ageing, unallocatedCredit };
};

/**
 * Running statement for one supplier: goods receipts as debits, payments as
 * credits, plus ageing of what is still outstanding.
 *
 * ALLOCATION RULE — not specified by the plan, chosen here and applied
 * consistently: a payment carrying a goods_receipt_id settles that receipt;
 * a payment without one (on account, or booked against a purchase order)
 * settles the oldest outstanding receipt first. Ageing follows that allocation.
 * Change it here and the brackets change with it.
 *
 * TRANSITIONAL STATE: the ledger is built from real documents, so liabilities
 * that predate Phase 2 are invisible until the cut-over creates one
 * opening-balance goods receipt per supplier. Until then a supplier with
 * historical payments and no receipts shows a negative balance, which is
 * reported honestly rather than clamped, and called out in `diagnostics`.
 */
export const getSupplierStatement = async (
    manifestId: string,
    supplierId: string,
    range: { from?: string; to?: string } = {}
) => {
    if (!isUuidV4(supplierId)) {
        throw SalesRequestError.validation('supplierId', 'Must be a valid v4 UUID');
    }
    if (range.from !== undefined && !isIsoDate(range.from)) {
        throw SalesRequestError.validation('from', 'Must be a calendar date as YYYY-MM-DD');
    }
    if (range.to !== undefined && !isIsoDate(range.to)) {
        throw SalesRequestError.validation('to', 'Must be a calendar date as YYYY-MM-DD');
    }
    if (range.from && range.to && range.from > range.to) {
        throw SalesRequestError.validation('from', 'Must not be later than "to"');
    }

    const { data: supplier, error: supplierError } = await supabase
        .from('sales_suppliers')
        .select('id, name')
        .eq('id', supplierId)
        .eq('manifest_id', manifestId)
        .maybeSingle();
    if (supplierError) throw supplierError;
    if (!supplier) throw SalesRequestError.notFound('Supplier not found');

    const [receiptsResult, paymentsResult] = await Promise.all([
        supabase
            .from('sales_goods_receipts')
            .select('id, grn_number, received_date, total_cost, delivery_note_number, payment_terms')
            .eq('manifest_id', manifestId)
            .eq('supplier_id', supplierId),
        supabase
            .from('sales_procurement_payments')
            .select('id, amount, payment_date, payment_method, transaction_reference, goods_receipt_id, procurement_request_id')
            .eq('manifest_id', manifestId)
            .eq('supplier_id', supplierId)
    ]);
    if (receiptsResult.error) throw receiptsResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    const receipts = (receiptsResult.data || []).map((r: any) => ({
        id: r.id,
        date: r.received_date as string,
        reference: r.grn_number as string,
        description: r.delivery_note_number
            ? `Goods received, delivery note ${r.delivery_note_number}`
            : 'Goods received',
        amount: Number(r.total_cost)
    }));

    const payments = (paymentsResult.data || []).map((p: any) => ({
        id: p.id,
        date: toKampalaDate(p.payment_date),
        reference: p.transaction_reference || null,
        description: p.goods_receipt_id
            ? 'Payment against goods receipt'
            : (p.procurement_request_id ? 'Payment against purchase order' : 'Payment on account'),
        method: p.payment_method as string,
        goodsReceiptId: p.goods_receipt_id as string | null,
        amount: Number(p.amount)
    }));

    // ---- statement lines -------------------------------------------------
    type Entry = {
        date: string; type: 'GOODS_RECEIPT' | 'PAYMENT'; reference: string | null;
        description: string; debit: number; credit: number;
    };
    const entries: Entry[] = [
        ...receipts.map((r): Entry => ({
            date: r.date, type: 'GOODS_RECEIPT', reference: r.reference,
            description: r.description, debit: r.amount, credit: 0
        })),
        ...payments.map((p): Entry => ({
            date: p.date, type: 'PAYMENT', reference: p.reference,
            description: `${p.description} (${p.method})`, debit: 0, credit: p.amount
        }))
    ].sort((a, b) =>
        a.date === b.date
            // A receipt and its payment on the same day read better debit-first.
            ? (a.type === b.type ? 0 : a.type === 'GOODS_RECEIPT' ? -1 : 1)
            : (a.date < b.date ? -1 : 1)
    );

    const openingBalance = range.from
        ? entries.filter(e => e.date < range.from!).reduce((sum, e) => sum + e.debit - e.credit, 0)
        : 0;

    const inRange = entries.filter(e =>
        (!range.from || e.date >= range.from) && (!range.to || e.date <= range.to));

    let running = openingBalance;
    const lines = inRange.map(e => {
        running += e.debit - e.credit;
        return { ...e, balance: running };
    });
    const closingBalance = running;

    // ---- ageing on what is still outstanding ------------------------------
    const asOf = range.to ?? new Date(Date.now() + KAMPALA_OFFSET_MS).toISOString().slice(0, 10);
    const { ageing, unallocatedCredit } = computeSupplierAgeing(receipts, payments, asOf);

    return {
        supplier: { id: supplier.id, name: supplier.name },
        period: { from: range.from ?? null, to: range.to ?? null, asOf },
        openingBalance,
        lines,
        closingBalance,
        ageing,
        diagnostics: {
            goodsReceiptCount: receipts.length,
            paymentCount: payments.length,
            paymentsNotLinkedToGoodsReceipt: payments.filter(p => !p.goodsReceiptId).length,
            // Credit that could not be matched to any receipt. While this is
            // non-zero the ageing understates what is really owed, because the
            // matching debit has not been entered as an opening-balance GRN.
            unallocatedCredit,
            openingBalanceReceiptMissing: unallocatedCredit > 0
        }
    };
};

/**
 * Records a goods receipt, with or without a purchase order.
 *
 * Shape and types are validated here so a malformed payload fails fast with a
 * named field. The business rules — what each payment term permits, whether the
 * account can fund it, whether the period is closed — belong to
 * sales_record_goods_receipt and are deliberately NOT duplicated here. Two
 * copies of the same arithmetic drift apart, and only the RPC's copy runs
 * inside the transaction that holds the locks.
 */
export const createGoodsReceipt = async (manifestId: string, payload: any, auditContext: any) => {
    const {
        supplierId, items, paymentTerms, receivedDate, procurementRequestId,
        deliveryNoteNumber, amountPaidOnReceipt, accountId, paymentMethod, reference, notes
    } = parseOrThrow(CreateGoodsReceiptSchema, payload);

    const mappedItems = items.map(item => ({
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        procurement_request_item_id: item.procurementRequestItemId ?? null
    }));

    const { data, error } = await supabase.rpc(SALES_RPC.RECORD_GOODS_RECEIPT, {
        p_manifest_id: manifestId,
        p_supplier_id: supplierId,
        p_items: mappedItems,
        p_payment_terms: paymentTerms,
        p_received_date: receivedDate ?? null,
        p_procurement_request_id: procurementRequestId ?? null,
        p_delivery_note_number: deliveryNoteNumber ?? null,
        p_amount_paid_on_receipt: amountPaidOnReceipt ?? 0,
        p_account_id: accountId ?? null,
        p_payment_method: paymentMethod ?? null,
        p_reference: reference ?? null,
        p_notes: notes ?? null,
        p_created_by: auditContext?.actorName ?? auditContext?.actorId ?? null
    });
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'CREATE_GOODS_RECEIPT',
        moduleName: 'sales',
        entityName: 'sales_goods_receipts',
        entityId: data?.goods_receipt_id,
        afterValues: {
            grnNumber: data?.grn_number,
            supplierId,
            procurementRequestId: procurementRequestId ?? null,
            paymentTerms,
            lines: data?.lines,
            unitsReceived: data?.units_received,
            totalCost: data?.total_cost,
            amountPaid: data?.amount_paid,
            balance: data?.balance,
            paymentId: data?.payment_id,
            ordersReserved: data?.orders_reserved
        }
    });

    return data;
};

/**
 * Records a payment to a supplier: on account, against a goods receipt, or
 * against a purchase order.
 *
 * Routed through sales_record_supplier_payment (migration 44), which locks the
 * account, runs the overdraft guard, writes account_id so the payment reaches
 * sales_account_ledger, and recomputes the purchase order totals in the same
 * transaction.
 *
 * This is the only way to record a supplier payment. payments.service.ts used
 * to hold a direct-insert version that wrote no account_id, so its payments
 * never reduced the cash position; it has been removed. Do not reintroduce one.
 *
 * As with goods receipts, only shape and types are checked here. Sufficiency of
 * funds, closed periods and document ownership belong to the RPC.
 */
export const recordSupplierPayment = async (
    manifestId: string,
    supplierId: string,
    payload: any,
    auditContext: any
) => {
    // supplierId comes from the route, not the body, so it is checked on its own.
    if (!isUuidV4(supplierId)) {
        throw SalesRequestError.validation('supplierId', 'Must be a valid v4 UUID');
    }

    const {
        amount, accountId, paymentMethod, paymentDate,
        goodsReceiptId, procurementRequestId, reference, notes
    } = parseOrThrow(RecordSupplierPaymentSchema, payload);

    const { data, error } = await supabase.rpc(SALES_RPC.RECORD_SUPPLIER_PAYMENT, {
        p_manifest_id: manifestId,
        p_supplier_id: supplierId,
        p_amount: amount,
        p_account_id: accountId,
        p_payment_method: paymentMethod,
        p_payment_date: paymentDate ?? null,
        p_goods_receipt_id: goodsReceiptId ?? null,
        p_procurement_request_id: procurementRequestId ?? null,
        p_reference: reference ?? null,
        p_notes: notes ?? null,
        p_created_by: auditContext?.actorName ?? auditContext?.actorId ?? null
    });
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'RECORD_SUPPLIER_PAYMENT',
        moduleName: 'sales',
        entityName: 'sales_procurement_payments',
        entityId: data?.payment_id,
        afterValues: {
            supplierId,
            amount,
            accountId,
            paymentMethod,
            paymentDate: data?.payment_date,
            goodsReceiptId: goodsReceiptId ?? null,
            procurementRequestId: procurementRequestId ?? null,
            accountBalance: data?.account_balance,
            requestBalanceDue: data?.request_balance_due
        }
    });

    return data;
};

/**
 * Edits an existing supplier payment.
 *
 * Routed through sales_update_supplier_payment (migration 47). Editing can move
 * money between two accounts in one step, so the RPC locks the purchase order
 * and both accounts in a fixed order, tests only the additional exposure, and
 * recomputes the order totals in the same transaction.
 *
 * The closed-period trigger checks the old date as well as the new one, so a
 * payment cannot be edited into — or out of — a closed month.
 *
 * Only shape and types are checked here. Sufficiency of funds, closed periods
 * and ownership of the payment belong to the RPC.
 */
export const updateSupplierPayment = async (
    manifestId: string,
    paymentId: string,
    payload: any,
    auditContext: any
) => {
    // paymentId comes from the route, not the body, so it is checked on its own.
    if (!isUuidV4(paymentId)) {
        throw SalesRequestError.validation('paymentId', 'Must be a valid v4 UUID');
    }

    const { amount, accountId, paymentMethod, paymentDate, reference, notes } =
        parseOrThrow(UpdateSupplierPaymentSchema, payload);

    // Read the row first so the audit entry can carry what actually changed.
    // The RPC re-reads it under lock; this copy is for the log only and is
    // never used to decide anything.
    const { data: before } = await supabase
        .from('sales_procurement_payments')
        .select('*')
        .eq('manifest_id', manifestId)
        .eq('id', paymentId)
        .maybeSingle();

    const { data, error } = await supabase.rpc(SALES_RPC.UPDATE_SUPPLIER_PAYMENT, {
        p_manifest_id: manifestId,
        p_payment_id: paymentId,
        p_amount: amount,
        p_account_id: accountId,
        p_payment_method: paymentMethod,
        p_payment_date: paymentDate ?? null,
        p_reference: reference ?? null,
        p_notes: notes ?? null,
        p_updated_by: auditContext?.actorName ?? auditContext?.actorId ?? null
    });
    if (error) throw error;

    const after = {
        amount,
        accountId,
        paymentMethod,
        paymentDate: data?.payment_date,
        reference: reference ?? null,
        notes: notes ?? null
    };

    logAudit({
        ...auditContext,
        actionType: 'UPDATE_SUPPLIER_PAYMENT',
        moduleName: 'sales',
        entityName: 'sales_procurement_payments',
        entityId: paymentId,
        beforeValues: before ?? undefined,
        afterValues: { ...after, accountBalance: data?.account_balance, requestBalanceDue: data?.request_balance_due },
        changedFields: before ? computeChangedFields(
            {
                amount: Number(before.amount),
                accountId: before.account_id,
                paymentMethod: before.payment_method,
                reference: before.transaction_reference,
                notes: before.notes
            },
            { amount, accountId, paymentMethod, reference: reference ?? null, notes: notes ?? null }
        ) : undefined
    });

    return data;
};

/**
 * Deletes a supplier payment outright.
 *
 * Routed through sales_delete_supplier_payment (migration 47), which locks the
 * order and the account, removes the row and recomputes the order totals in one
 * transaction. No balance repair is needed: sales_account_ledger is a view, so
 * removing the row removes its ledger entry and the account rises again by the
 * amount.
 *
 * The row is read in full first and written to the audit log, because the row
 * itself does not survive. A payment dated in a closed month is refused by the
 * period trigger.
 */
export const deleteSupplierPayment = async (
    manifestId: string,
    paymentId: string,
    auditContext: any
) => {
    if (!isUuidV4(paymentId)) {
        throw SalesRequestError.validation('paymentId', 'Must be a valid v4 UUID');
    }

    const { data: before } = await supabase
        .from('sales_procurement_payments')
        .select('*')
        .eq('manifest_id', manifestId)
        .eq('id', paymentId)
        .maybeSingle();

    const { data, error } = await supabase.rpc(SALES_RPC.DELETE_SUPPLIER_PAYMENT, {
        p_manifest_id: manifestId,
        p_payment_id: paymentId,
        p_deleted_by: auditContext?.actorName ?? auditContext?.actorId ?? null
    });
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'DELETE_SUPPLIER_PAYMENT',
        moduleName: 'sales',
        entityName: 'sales_procurement_payments',
        entityId: paymentId,
        beforeValues: before ?? undefined,
        afterValues: {
            accountBalance: data?.account_balance,
            requestBalanceDue: data?.request_balance_due
        }
    });

    return data;
};

/**
 * Receives stock against a procurement request line.
 *
 * Routed through the sales_record_goods_receipt RPC (migration 42), so the
 * whole operation — goods receipt, receipt line, stock increment, IN movement,
 * quantity_received roll-up and request status roll-forward — is one atomic
 * transaction that locks the variant row.
 *
 * The previous implementation did this as four unordered statements and
 * trusted the client for `variantId` and `currentQtyReceived`, which meant two
 * concurrent receives could each write `currentQtyReceived + qty` from the same
 * stale base and silently lose one, and an id belonging to another tenant would
 * have been written to. Everything except the line and the quantity is now
 * derived from the database.
 *
 * Terms are CREDIT: receiving against a PO records the liability, and payment
 * is recorded separately through the supplier payment endpoints. `unit_cost`
 * comes from the line's `expected_cost` rather than from the request.
 */
export const receiveProcurementItem = async (manifestId: string, payload: any, auditContext: any) => {
    const { itemId, qtyReceivedNow } = payload ?? {};

    if (!isUuidV4(itemId)) {
        throw SalesRequestError.validation('itemId', 'Must be a valid v4 UUID');
    }
    if (!isPositiveInteger(qtyReceivedNow)) {
        throw SalesRequestError.validation('qtyReceivedNow', 'Must be a whole number greater than zero');
    }

    const { data: item, error: itemError } = await supabase
        .from('sales_procurement_request_items')
        .select('id, request_id, variant_id, quantity_ordered, quantity_received, expected_cost')
        .eq('id', itemId)
        .maybeSingle();
    if (itemError) throw itemError;
    if (!item) throw SalesRequestError.notFound('Procurement request item not found');

    // Tenant check lives here: the item table carries no manifest_id, so
    // ownership is established through its parent request.
    const { data: request, error: requestError } = await supabase
        .from('sales_procurement_requests')
        .select('id, supplier_id')
        .eq('id', item.request_id)
        .eq('manifest_id', manifestId)
        .maybeSingle();
    if (requestError) throw requestError;
    if (!request) throw SalesRequestError.notFound('Procurement request item not found');

    if (!request.supplier_id) {
        throw SalesRequestError.validation(
            'supplierId',
            'The procurement request has no supplier, so the receipt cannot be booked to a supplier ledger'
        );
    }

    const outstanding = item.quantity_ordered - item.quantity_received;
    if (qtyReceivedNow > outstanding) {
        throw SalesRequestError.conflict(
            `Cannot receive ${qtyReceivedNow}; only ${outstanding} of ${item.quantity_ordered} remain outstanding`
        );
    }

    const { data, error } = await supabase.rpc(SALES_RPC.RECORD_GOODS_RECEIPT, {
        p_manifest_id: manifestId,
        p_supplier_id: request.supplier_id,
        p_items: [{
            variant_id: item.variant_id,
            quantity: qtyReceivedNow,
            unit_cost: item.expected_cost,
            procurement_request_item_id: item.id
        }],
        p_payment_terms: GOODS_RECEIPT_TERMS.CREDIT,
        p_procurement_request_id: request.id,
        p_created_by: auditContext?.actorName ?? auditContext?.actorId ?? null
    });
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'RECEIVE_PROCUREMENT_ITEM',
        moduleName: 'sales',
        entityName: 'sales_goods_receipts',
        entityId: data?.goods_receipt_id ?? itemId,
        afterValues: {
            goodsReceiptId: data?.goods_receipt_id,
            grnNumber: data?.grn_number,
            requestItemId: item.id,
            variantId: item.variant_id,
            qtyReceivedNow,
            newTotalReceived: item.quantity_received + qtyReceivedNow,
            unitCost: item.expected_cost,
            totalCost: data?.total_cost,
            ordersReserved: data?.orders_reserved
        }
    });

    return data;
};
