/**
 * Shared sales constants. No naked status strings anywhere in the module —
 * see ENFORCEMENT.md section 2.2.
 */

/** Payment terms accepted by sales_record_goods_receipt (migration 42). */
export const GOODS_RECEIPT_TERMS = {
    PAID: 'PAID',
    CREDIT: 'CREDIT',
    PART_PAID: 'PART_PAID'
} as const;

export type GoodsReceiptTerms = typeof GOODS_RECEIPT_TERMS[keyof typeof GOODS_RECEIPT_TERMS];

export const GOODS_RECEIPT_TERMS_VALUES: readonly string[] = Object.values(GOODS_RECEIPT_TERMS);

/** Account types permitted by the CHECK constraint in migration 34. */
export const ACCOUNT_TYPES = {
    CASH: 'CASH',
    MOBILE_MONEY: 'MOBILE_MONEY',
    BANK: 'BANK'
} as const;

export type AccountType = typeof ACCOUNT_TYPES[keyof typeof ACCOUNT_TYPES];

export const ACCOUNT_TYPE_VALUES: readonly string[] = Object.values(ACCOUNT_TYPES);

/**
 * Entry types emitted by the sales_account_ledger view (migration 40).
 * TRANSFER_OUT carries amount + charges; TRANSFER_IN carries the amount only.
 */
export const LEDGER_ENTRY_TYPES = {
    SALE_RECEIPT: 'SALE_RECEIPT',
    REFUND: 'REFUND',
    SUPPLIER_PAYMENT: 'SUPPLIER_PAYMENT',
    EXPENSE: 'EXPENSE',
    OTHER_IN: 'OTHER_IN',
    OTHER_OUT: 'OTHER_OUT',
    TRANSFER_IN: 'TRANSFER_IN',
    TRANSFER_OUT: 'TRANSFER_OUT'
} as const;

export type LedgerEntryType = typeof LEDGER_ENTRY_TYPES[keyof typeof LEDGER_ENTRY_TYPES];

/**
 * Roles allowed to change an account's structure. Normalised by validateRole.
 *
 * FINANCE is included because setting an opening balance is the counterpart of
 * paying a supplier: the same people who may move money out of an account must
 * be able to state what was in it to begin with.
 */
export const ACCOUNT_ADMIN_ROLES = ['ADMIN', 'HOD', 'FINANCE'];

/**
 * Roles allowed to bring stock in against a purchase order.
 *
 * A goods receipt is not a purely operational act: it raises a payable, and on
 * PAID terms it moves money out of an account in the same transaction. So it
 * sits with the same people who may spend, not with anyone who can log in.
 *
 * These strings are the normalised forms validateRole() produces, so 'ADMIN'
 * covers both Administrator and Super Admin, and 'HOD' covers Department.
 */
export const GOODS_RECEIPT_ROLES = ['ADMIN', 'HOD', 'FINANCE'];

/** Roles allowed to pay a supplier. Money leaving an account. */
export const SUPPLIER_PAYMENT_ROLES = ['ADMIN', 'HOD', 'FINANCE'];

/**
 * Roles allowed to read the supplier ledger.
 *
 * A statement discloses what the organisation owes and what it has paid, so it
 * is gated like the money it describes rather than left open to every
 * authenticated user.
 */
export const SUPPLIER_LEDGER_READ_ROLES = ['ADMIN', 'HOD', 'FINANCE'];

/** Today's date in Africa/Kampala as YYYY-MM-DD. Kampala has no DST. */
export const kampalaToday = (): string =>
    new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Shifts a YYYY-MM-DD date by whole days. */
export const shiftDate = (date: string, days: number): string =>
    new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Payment methods permitted by the CHECK constraint migration 34 applied to
 * sales_payments and sales_procurement_payments. Anything else is rejected by
 * the database, so reject it here first with a field-specific message.
 */
export const PAYMENT_METHODS = {
    CASH: 'Cash',
    MTN: 'MTN Mobile Money',
    AIRTEL: 'Airtel Money',
    BANK: 'Bank',
    CARD: 'Card',
    OTHER: 'Other'
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_VALUES: readonly string[] = Object.values(PAYMENT_METHODS);

/** Postgres RPC names exposed by the sales migrations. */
export const SALES_RPC = {
    RECORD_GOODS_RECEIPT: 'sales_record_goods_receipt',
    RECORD_SUPPLIER_PAYMENT: 'sales_record_supplier_payment',
    UPDATE_SUPPLIER_PAYMENT: 'sales_update_supplier_payment',
    DELETE_SUPPLIER_PAYMENT: 'sales_delete_supplier_payment',
    RECORD_PAYMENT: 'sales_record_payment',
    PROCESS_REFUND: 'sales_process_refund',
    PROCESS_CHECKOUT: 'sales_process_checkout',
    FULFILL_ORDER: 'sales_fulfill_order',
    RECORD_TRANSFER: 'sales_record_transfer',
    APPROVE_EXPENSE: 'sales_approve_expense',
    COMPLETE_STOCK_TAKE: 'sales_complete_stock_take',
    ACCOUNT_BALANCE: 'sales_account_balance',
    ACCOUNT_BALANCE_ASOF: 'sales_account_balance_asof'
} as const;

/**
 * Version-4 UUID, as mandated by VALIDATION_RULES section 1.1.
 *
 * Note: the sentinel manifest id '00000000-0000-0000-0000-000000000000' present
 * in some legacy sales rows is NOT a v4 UUID and will not match. Use this to
 * validate client-supplied identifiers, not to re-validate a tenant id that
 * auth middleware has already established.
 */
export const UUID_V4_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuidV4 = (value: unknown): value is string =>
    typeof value === 'string' && UUID_V4_PATTERN.test(value);

/**
 * A positive integer quantity or amount.
 *
 * VALIDATION_RULES section 1.3 requires amounts to cross the wire as integers,
 * never as formatted strings like "10,000".
 */
export const isPositiveInteger = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value > 0;

/** Zero or a positive integer. Used for costs and part payments, which may be 0. */
export const isNonNegativeInteger = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0;

/**
 * A calendar date as YYYY-MM-DD, and a real date rather than 2026-02-31.
 *
 * Dates are passed to the RPCs as plain DATE strings, never as timestamps, so
 * there is no timezone to get wrong at this boundary. When the caller omits the
 * date the RPC defaults it to today in Africa/Kampala.
 */
export const isIsoDate = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
