import { z } from 'zod';
import {
    uuidV4, shillings, nonNegativeShillings, positiveCount, isoDate
} from './common';
import {
    GOODS_RECEIPT_TERMS_VALUES, PAYMENT_METHOD_VALUES, ACCOUNT_TYPE_VALUES
} from '../../modules/sales/shared/salesConstants';

/**
 * Payload schemas for the Sales & Merchandise write endpoints.
 *
 * Every schema is `.strict()`. That is the point of the exercise: an unknown
 * key is a 422 naming the key, not a silently dropped field. A caller that
 * sends `amountPaid` where the endpoint expects `amountPaidOnReceipt` used to
 * get a cheerful 201 with the payment quietly discarded, which is precisely the
 * kind of silent wrong answer ENFORCEMENT forbids.
 *
 * Optional fields accept null as well as absent, because the services already
 * normalise both to null before the RPC call and clients send either.
 */

/** `.nullish()` plus the field's own rule — absent, null, or valid. */
const optional = <T extends z.ZodTypeAny>(schema: T) => schema.nullish();

const enumOf = (values: readonly string[], label: string) =>
    z.string().refine(v => values.includes(v), `Must be one of ${values.join(', ')}`).describe(label);

// ─── Goods receipts ──────────────────────────────────────────────────────────

export const GoodsReceiptItemSchema = z.strictObject({
    variantId: uuidV4,
    quantity: positiveCount,
    unitCost: nonNegativeShillings,
    procurementRequestItemId: optional(uuidV4)
});

export const CreateGoodsReceiptSchema = z.strictObject({
    supplierId: uuidV4,
    items: z.array(GoodsReceiptItemSchema).min(1, 'At least one received line is required'),
    paymentTerms: enumOf(GOODS_RECEIPT_TERMS_VALUES, 'paymentTerms'),
    receivedDate: optional(isoDate),
    procurementRequestId: optional(uuidV4),
    deliveryNoteNumber: optional(z.string().max(100)),
    amountPaidOnReceipt: optional(nonNegativeShillings),
    accountId: optional(uuidV4),
    paymentMethod: optional(enumOf(PAYMENT_METHOD_VALUES, 'paymentMethod')),
    reference: optional(z.string().max(200)),
    notes: optional(z.string().max(2000))
}).superRefine((value, ctx) => {
    // A receipt that settles anything must say where the money came from.
    // The RPC enforces the amount rules per payment term and the overdraft
    // guard; these two only catch a payload that could not be honoured at all,
    // so the caller is told which field is missing rather than being handed a
    // null-constraint error from Postgres.
    const paying = (value.amountPaidOnReceipt ?? 0) > 0 || value.paymentTerms !== 'CREDIT';
    if (paying && !value.accountId) {
        ctx.addIssue({
            code: 'custom',
            path: ['accountId'],
            message: `Required for a ${value.paymentTerms} receipt: name the account the money leaves`
        });
    }
    if (paying && !value.paymentMethod) {
        ctx.addIssue({
            code: 'custom',
            path: ['paymentMethod'],
            message: `Required for a ${value.paymentTerms} receipt`
        });
    }
});

// ─── Supplier payments ───────────────────────────────────────────────────────

export const RecordSupplierPaymentSchema = z.strictObject({
    amount: shillings,
    accountId: uuidV4,
    paymentMethod: enumOf(PAYMENT_METHOD_VALUES, 'paymentMethod'),
    paymentDate: optional(isoDate),
    goodsReceiptId: optional(uuidV4),
    procurementRequestId: optional(uuidV4),
    reference: optional(z.string().max(200)),
    notes: optional(z.string().max(2000))
});

/**
 * Editing an existing payment.
 *
 * amount, accountId and paymentMethod are required because an edit replaces
 * them outright — there is no "leave the amount as it was" here, and a
 * half-specified money change is how the wrong figure gets saved. The form
 * sends what it shows.
 *
 * supplierId, procurementRequestId and goodsReceiptId are absent by design:
 * re-pointing a payment at another supplier or document is a different
 * operation, and `.strict()` reports an attempt rather than ignoring it.
 * Delete the payment and record it again against the right document.
 *
 * paymentDate absent means the date is left alone. reference and notes are
 * replacements, so omitting them clears the stored value.
 */
export const UpdateSupplierPaymentSchema = z.strictObject({
    amount: shillings,
    accountId: uuidV4,
    paymentMethod: enumOf(PAYMENT_METHOD_VALUES, 'paymentMethod'),
    paymentDate: optional(isoDate),
    reference: optional(z.string().max(200)),
    notes: optional(z.string().max(2000))
});

// ─── Money accounts ──────────────────────────────────────────────────────────

export const CreateAccountSchema = z.strictObject({
    name: z.string().min(2, 'Must be at least 2 characters').max(100),
    accountType: enumOf(ACCOUNT_TYPE_VALUES, 'accountType'),
    provider: optional(z.string().max(100)),
    accountNumber: optional(z.string().max(100)),
    openingBalance: optional(nonNegativeShillings),
    openingBalanceDate: optional(isoDate)
});

/**
 * Account type is absent by design: it decides whether an account may go
 * negative, so changing it would reinterpret every balance already reported.
 * Sending it is a mistake worth reporting, and `.strict()` does exactly that.
 */
export const UpdateAccountSchema = z.strictObject({
    name: optional(z.string().min(2, 'Must be at least 2 characters').max(100)),
    provider: optional(z.string().max(100)),
    accountNumber: optional(z.string().max(100)),
    openingBalance: optional(nonNegativeShillings),
    openingBalanceDate: optional(isoDate),
    isActive: optional(z.boolean())
}).refine(v => Object.values(v).some(x => x !== undefined), {
    message: 'No fields to update'
});

// ─── POS checkout ─────────────────────────────────────────────────────

/**
 * A cart line. Price is deliberately absent: sales_process_checkout reads
 * selling_price and cost_price from the variant row it has already locked, so a
 * price sent by the client would be ignored. Accepting one and ignoring it is
 * the silent-wrong-answer case `.strict()` exists to prevent — a caller sending
 * `unit_price` now gets a 422 naming it rather than a receipt at a price
 * nobody charged.
 */
export const CheckoutItemSchema = z.strictObject({
    variantId: uuidV4,
    quantity: positiveCount
});

/**
 * POS checkout.
 *
 * `amountPaid` may be 0 — an unpaid order is a legitimate checkout — so it is
 * nonNegative rather than positive, and the two payment fields are required
 * only once money actually changes hands. Without `accountId` the payment row
 * carries no account, which is exactly the defect that left supplier payments
 * invisible to sales_account_ledger and the cash position overstated; the RPC
 * refuses it outright, and this names the field first.
 *
 * `createdBy` is absent by design. It comes from the authenticated session, not
 * from the client, so a caller cannot record a sale under someone else's name.
 */
export const ProcessCheckoutSchema = z.strictObject({
    items: z.array(CheckoutItemSchema).min(1, 'At least one item is required'),
    amountPaid: nonNegativeShillings,
    accountId: optional(uuidV4),
    paymentMethod: optional(enumOf(PAYMENT_METHOD_VALUES, 'paymentMethod')),
    customerId: optional(uuidV4),
    reference: optional(z.string().max(200))
}).superRefine((value, ctx) => {
    if (value.amountPaid > 0 && !value.accountId) {
        ctx.addIssue({
            code: 'custom',
            path: ['accountId'],
            message: 'Required when a payment is taken — say which account received the money'
        });
    }
    if (value.amountPaid > 0 && !value.paymentMethod) {
        ctx.addIssue({
            code: 'custom',
            path: ['paymentMethod'],
            message: 'Required when a payment is taken'
        });
    }
});

// ─── Fulfilment ─────────────────────────────────────────────────────

/**
 * Fulfil an order in full. Quantities are absent because this endpoint has only
 * ever meant "hand over everything outstanding" — sales_fulfill_order calls
 * sales_record_delivery with no item list. A part delivery needs the line
 * quantities and belongs on its own endpoint.
 */
export const FulfillOrderSchema = z.strictObject({
    orderId: uuidV4
});

export type CreateGoodsReceiptInput = z.infer<typeof CreateGoodsReceiptSchema>;

export type RecordSupplierPaymentInput = z.infer<typeof RecordSupplierPaymentSchema>;
export type UpdateSupplierPaymentInput = z.infer<typeof UpdateSupplierPaymentSchema>;
export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
export type ProcessCheckoutInput = z.infer<typeof ProcessCheckoutSchema>;
export type FulfillOrderInput = z.infer<typeof FulfillOrderSchema>;
