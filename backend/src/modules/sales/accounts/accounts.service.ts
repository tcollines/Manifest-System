import { supabase } from '../../../supabase';
import { logAudit, computeChangedFields } from '../../../services/audit/auditService';
import { SalesRequestError } from '../shared/salesErrors';
import {
    ACCOUNT_TYPE_VALUES, SALES_RPC, LEDGER_ENTRY_TYPES,
    isUuidV4, isNonNegativeInteger, isIsoDate, kampalaToday, shiftDate
} from '../shared/salesConstants';
import { parseOrThrow } from '../../../shared/validators/common';
import { CreateAccountSchema, UpdateAccountSchema } from '../../../shared/validators/salesSchemas';

/**
 * Money accounts: the four tills the department's cash actually sits in.
 *
 * Balances are never computed here. They come from sales_account_balance_asof
 * (migration 40), which is the single authority on what an account holds — it
 * ignores ledger entries dated before opening_balance_date, because the opening
 * balance is a physical count on that date and already contains them. Anything
 * recomputing that rule in TypeScript would drift from the overdraft guard the
 * RPCs enforce, and the two disagreeing about whether a payment fits is exactly
 * the bug worth avoiding.
 */

const selectAccount = 'id, manifest_id, name, account_type, provider, account_number, opening_balance, opening_balance_date, is_active, created_at, created_by';

const balanceOf = async (accountId: string, asOf?: string): Promise<number> => {
    const { data, error } = await supabase.rpc(SALES_RPC.ACCOUNT_BALANCE_ASOF, {
        p_account_id: accountId,
        p_as_of: asOf ?? null
    });
    if (error) throw error;
    return Number(data ?? 0);
};

/**
 * Lists accounts with their current balance, or their balance on a given date.
 *
 * One balance call per account. With the four seeded accounts that is four
 * round trips, issued in parallel; if a manifest ever grows dozens of accounts
 * this should move to a single grouped query over the ledger view.
 */
export const getAccounts = async (
    manifestId: string,
    options: { asOf?: string; includeInactive?: boolean } = {}
) => {
    if (options.asOf !== undefined && !isIsoDate(options.asOf)) {
        throw SalesRequestError.validation('asOf', 'Must be a calendar date as YYYY-MM-DD');
    }

    let query = supabase
        .from('sales_money_accounts')
        .select(selectAccount)
        .eq('manifest_id', manifestId);

    if (!options.includeInactive) query = query.eq('is_active', true);

    const { data, error } = await query.order('account_type', { ascending: true }).order('name', { ascending: true });
    if (error) throw error;

    const accounts = data || [];
    const balances = await Promise.all(accounts.map(a => balanceOf(a.id, options.asOf)));

    return accounts.map((account, i) => ({
        ...account,
        balance: balances[i],
        balance_as_of: options.asOf ?? null
    }));
};

/**
 * Total funds across every account, plus the per-account split.
 *
 * Inactive accounts are included: money does not stop existing because the
 * account was hidden from a dropdown, and excluding them would make the total
 * disagree with the sum of the ledger.
 */
export const getAccountBalances = async (manifestId: string, asOf?: string) => {
    const accounts = await getAccounts(manifestId, { asOf, includeInactive: true });
    return {
        asOf: asOf ?? null,
        totalFunds: accounts.reduce((sum, a) => sum + a.balance, 0),
        accounts: accounts.map(a => ({
            id: a.id,
            name: a.name,
            accountType: a.account_type,
            isActive: a.is_active,
            balance: a.balance
        }))
    };
};

export const createAccount = async (manifestId: string, payload: any, auditContext: any) => {
    const {
        name, accountType, provider, accountNumber, openingBalance, openingBalanceDate
    } = parseOrThrow(CreateAccountSchema, payload);

    const { data, error } = await supabase
        .from('sales_money_accounts')
        .insert([{
            manifest_id: manifestId,
            name: name.trim(),
            account_type: accountType,
            provider: provider ?? null,
            account_number: accountNumber ?? null,
            opening_balance: openingBalance ?? 0,
            opening_balance_date: openingBalanceDate ?? kampalaToday(),
            created_by: auditContext?.actorName ?? auditContext?.actorId ?? null
        }])
        .select(selectAccount)
        .single();

    // UNIQUE (manifest_id, name) — a duplicate is a user error, not a fault.
    if (error?.code === '23505') {
        throw SalesRequestError.conflict(`An account named "${name.trim()}" already exists`);
    }
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'CREATE_MONEY_ACCOUNT',
        moduleName: 'sales',
        entityName: 'sales_money_accounts',
        entityId: data.id,
        afterValues: data
    });

    return { ...data, balance: await balanceOf(data.id) };
};

/**
 * Renames, deactivates, or restates an account's opening balance.
 *
 * Restating opening_balance or opening_balance_date rewrites every balance the
 * account has ever reported, including the ones the overdraft guard has already
 * enforced against. That is the point — it is how the cut-over physical count
 * gets in — but it is why this is gated to Admin/HOD at the controller and why
 * the audit entry records the before and after.
 *
 * account_type is deliberately not editable: it decides whether the account may
 * go negative, and changing it retroactively would reinterpret history.
 */
export const updateAccount = async (manifestId: string, accountId: string, payload: any, auditContext: any) => {
    if (!isUuidV4(accountId)) {
        throw SalesRequestError.validation('accountId', 'Must be a valid v4 UUID');
    }

    const { data: before, error: beforeError } = await supabase
        .from('sales_money_accounts')
        .select(selectAccount)
        .eq('id', accountId)
        .eq('manifest_id', manifestId)
        .maybeSingle();
    if (beforeError) throw beforeError;
    if (!before) throw SalesRequestError.notFound('Account not found');

    const {
        name, provider, accountNumber, openingBalance, openingBalanceDate, isActive
    } = parseOrThrow(UpdateAccountSchema, payload);
    const updates: Record<string, unknown> = {};

    if (name !== undefined && name !== null) updates.name = name.trim();
    if (provider !== undefined) updates.provider = provider;
    if (accountNumber !== undefined) updates.account_number = accountNumber;
    if (openingBalance !== undefined && openingBalance !== null) {
        updates.opening_balance = openingBalance;
    }
    if (openingBalanceDate !== undefined && openingBalanceDate !== null) {
        updates.opening_balance_date = openingBalanceDate;
    }
    if (isActive !== undefined && isActive !== null) {
        updates.is_active = isActive;
    }

    if (Object.keys(updates).length === 0) {
        throw SalesRequestError.validation('body', 'No editable field was supplied');
    }

    const { data: after, error } = await supabase
        .from('sales_money_accounts')
        .update(updates)
        .eq('id', accountId)
        .eq('manifest_id', manifestId)
        .select(selectAccount)
        .single();

    if (error?.code === '23505') {
        throw SalesRequestError.conflict(`An account named "${String(updates.name)}" already exists`);
    }
    if (error) throw error;

    logAudit({
        ...auditContext,
        actionType: 'UPDATE_MONEY_ACCOUNT',
        moduleName: 'sales',
        entityName: 'sales_money_accounts',
        entityId: accountId,
        beforeValues: before,
        afterValues: after,
        changedFields: computeChangedFields(before, after)
    });

    return { ...after, balance: await balanceOf(accountId) };
};

export interface LedgerEntryRow {
    entry_date: string;
    entry_type: string;
    direction: 'IN' | 'OUT' | string;
    amount: number | string;
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

/**
 * Buckets ledger entries into daily cashbook rows and chains the balances.
 *
 * Only days with movement produce a row; each row's opening balance is the
 * previous row's closing balance, so the column reconciles down the page
 * without emitting a row for every idle day.
 *
 * Pure, so the bucketing and the chaining can be tested without a database —
 * which matters, because until opening balances are entered the live window is
 * empty and this logic would otherwise never run.
 */
export const buildCashbookDays = (
    entries: LedgerEntryRow[],
    openingBalance: number
): { days: CashbookDay[]; closingBalance: number } => {
    const byDate = new Map<string, CashbookDay>();

    for (const entry of entries) {
        const date = entry.entry_date;
        let day = byDate.get(date);
        if (!day) {
            day = {
                date, openingBalance: 0, salesIn: 0, otherIn: 0, transfersIn: 0, totalIn: 0,
                expensesOut: 0, supplierPaymentsOut: 0, refundsOut: 0, otherOut: 0,
                transfersOut: 0, totalOut: 0, closingBalance: 0
            };
            byDate.set(date, day);
        }

        const amount = Number(entry.amount);
        switch (entry.entry_type) {
            case LEDGER_ENTRY_TYPES.SALE_RECEIPT: day.salesIn += amount; break;
            case LEDGER_ENTRY_TYPES.OTHER_IN: day.otherIn += amount; break;
            case LEDGER_ENTRY_TYPES.TRANSFER_IN: day.transfersIn += amount; break;
            case LEDGER_ENTRY_TYPES.EXPENSE: day.expensesOut += amount; break;
            case LEDGER_ENTRY_TYPES.SUPPLIER_PAYMENT: day.supplierPaymentsOut += amount; break;
            case LEDGER_ENTRY_TYPES.REFUND: day.refundsOut += amount; break;
            case LEDGER_ENTRY_TYPES.OTHER_OUT: day.otherOut += amount; break;
            case LEDGER_ENTRY_TYPES.TRANSFER_OUT: day.transfersOut += amount; break;
            default:
                // An entry type added to the view without this switch being
                // updated would otherwise vanish from the cashbook while still
                // counting towards the balance, so bucket it by direction.
                if (entry.direction === 'IN') day.otherIn += amount;
                else day.otherOut += amount;
        }
    }

    let running = openingBalance;
    const days = [...byDate.values()]
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map(day => {
            day.totalIn = day.salesIn + day.otherIn + day.transfersIn;
            day.totalOut = day.expensesOut + day.supplierPaymentsOut + day.refundsOut + day.otherOut + day.transfersOut;
            day.openingBalance = running;
            running += day.totalIn - day.totalOut;
            day.closingBalance = running;
            return day;
        });

    return { days, closingBalance: running };
};

/**
 * Daily cashbook for one account: each day's opening balance, money in and out
 * split by where it came from, and the closing balance.
 *
 * Only days with movement appear. Each row's opening balance is the previous
 * row's closing balance, so the column still reconciles down the page without
 * emitting a row for every idle day.
 *
 * The window is clamped to start no earlier than opening_balance_date. Entries
 * before that date are excluded from sales_account_balance_asof, so including
 * them here would produce a cashbook whose closing balance disagreed with the
 * account balance shown everywhere else.
 */
export const getAccountCashbook = async (
    manifestId: string,
    accountId: string,
    range: { from?: string; to?: string } = {}
) => {
    if (!isUuidV4(accountId)) {
        throw SalesRequestError.validation('accountId', 'Must be a valid v4 UUID');
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

    const { data: account, error: accountError } = await supabase
        .from('sales_money_accounts')
        .select(selectAccount)
        .eq('id', accountId)
        .eq('manifest_id', manifestId)
        .maybeSingle();
    if (accountError) throw accountError;
    if (!account) throw SalesRequestError.notFound('Account not found');

    const today = kampalaToday();
    const to = range.to ?? today;
    const requestedFrom = range.from ?? `${to.slice(0, 7)}-01`;
    // Never start before the opening count; see the note above.
    const from = requestedFrom < account.opening_balance_date ? account.opening_balance_date : requestedFrom;

    const openingBalance = await balanceOf(accountId, shiftDate(from, -1));

    const { data: entries, error: entriesError } = await supabase
        .from('sales_account_ledger')
        .select('entry_date, entry_type, direction, amount, description, reference, source_table, source_id')
        .eq('manifest_id', manifestId)
        .eq('account_id', accountId)
        .gte('entry_date', from)
        .lte('entry_date', to)
        .order('entry_date', { ascending: true });
    if (entriesError) throw entriesError;

    const { days, closingBalance } = buildCashbookDays(entries || [], openingBalance);
    const running = closingBalance;

    return {
        account: {
            id: account.id,
            name: account.name,
            accountType: account.account_type,
            openingBalance: Number(account.opening_balance),
            openingBalanceDate: account.opening_balance_date
        },
        period: { from, to, requestedFrom, clampedToOpeningDate: from !== requestedFrom },
        openingBalance,
        days,
        closingBalance: running,
        entryCount: (entries || []).length
    };
};
