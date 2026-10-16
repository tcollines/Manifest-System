/**
 * Values the Sales backend accepts, mirrored for the UI.
 *
 * These are the display strings that PAYMENT_METHODS in
 * `backend/src/modules/sales/shared/salesConstants.ts` defines. The zod schemas
 * in `backend/src/shared/validators/salesSchemas.ts` reject anything else with a
 * 422 naming the field, so a dropdown that offers a value not in this list
 * produces a failed save, not a silently stored oddity.
 *
 * They are duplicated here rather than fetched because a select cannot wait on
 * a round trip. If the backend list changes, change this one with it.
 *
 * The dropdowns this replaces offered "Mobile Money" and "Bank Transfer",
 * neither of which is in that list. They were stored anyway because the legacy
 * endpoint validated nothing, so the supplier ledger now holds payment methods
 * that no report groups correctly.
 */
export const PAYMENT_METHODS = [
    'Cash',
    'MTN Mobile Money',
    'Airtel Money',
    'Bank',
    'Card',
    'Other'
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number];

/**
 * Best-guess method for an account, used only to preselect the dropdown.
 *
 * A BANK account is usually paid by bank transfer and a MOBILE_MONEY account by
 * its own network, but the two are independent — cash can be deposited into a
 * bank account — so the user can always override it.
 */
export const defaultMethodForAccount = (
    accountType: string,
    provider: string | null
): PaymentMethod => {
    if (accountType === 'BANK') return 'Bank';
    if (accountType === 'CASH') return 'Cash';
    if (accountType === 'MOBILE_MONEY') {
        const p = (provider || '').toUpperCase();
        if (p.includes('MTN')) return 'MTN Mobile Money';
        if (p.includes('AIRTEL')) return 'Airtel Money';
        return 'Other';
    }
    return 'Cash';
};
