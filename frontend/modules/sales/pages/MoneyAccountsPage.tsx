import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, Smartphone, Building, Pencil, Plus, AlertTriangle, RefreshCcw, BookOpen, X } from 'lucide-react';
import { accountService, MoneyAccount, Cashbook } from '../../../services/sales/accountService';
import { TextInput, NumberInput, SelectInput, DateInput } from '../../../components/inputs';
import { formatCurrency, formatDate, getKampalaToday } from '../../../shared/formatters';

const ACCOUNT_TYPE_OPTIONS = [
    { value: 'CASH', label: 'Cash' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' },
    { value: 'BANK', label: 'Bank' }
];

const TYPE_ICON: Record<string, React.ElementType> = {
    CASH: Wallet,
    MOBILE_MONEY: Smartphone,
    BANK: Building
};

const TYPE_STYLE: Record<string, string> = {
    CASH: 'text-green-600 bg-green-100',
    MOBILE_MONEY: 'text-blue-600 bg-blue-100',
    BANK: 'text-indigo-600 bg-indigo-100'
};

type Mode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; account: MoneyAccount };

const MoneyAccountsPage: React.FC = () => {
    const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
    const [totalFunds, setTotalFunds] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [mode, setMode] = useState<Mode>({ kind: 'closed' });
    /**
     * The open cashbook is tracked by id, not by holding the account object.
     *
     * Editing an account replaces the objects in `accounts`; a captured object
     * would keep the old opening balance date, so the cashbook effect would not
     * re-run and the panel would keep showing a window that no longer applies.
     * Deriving it from the list means a save restates the cashbook too.
     */
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [cashbook, setCashbook] = useState<Cashbook | null>(null);
    const [cashbookError, setCashbookError] = useState<string | null>(null);
    const [isCashbookLoading, setIsCashbookLoading] = useState(false);
    const [range, setRange] = useState({ from: `${getKampalaToday().slice(0, 7)}-01`, to: getKampalaToday() });

    const load = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        const [list, balances] = await Promise.all([
            accountService.getAccounts({ includeInactive: true }),
            accountService.getBalances()
        ]);
        // Always handle the error branch — EXECUTION_GUIDE step 7.
        if (list.status === 'error') setLoadError(list.message);
        else setAccounts(list.data);
        if (balances.status === 'success') setTotalFunds(balances.data.totalFunds);
        setIsLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const loadCashbook = useCallback(async (account: MoneyAccount, from: string, to: string) => {
        setIsCashbookLoading(true);
        setCashbookError(null);
        const res = await accountService.getCashbook(account.id, { from, to });
        if (res.status === 'error') { setCashbookError(res.message); setCashbook(null); }
        else setCashbook(res.data);
        setIsCashbookLoading(false);
    }, []);

    const selected = accounts.find(a => a.id === selectedId) ?? null;

    useEffect(() => {
        if (!selected) { setCashbook(null); return; }
        loadCashbook(selected, range.from, range.to);
        // `selected` is derived, so a new object identity every render would
        // loop. Depend on the fields that actually change the cashbook.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.id, selected?.openingBalanceDate, selected?.openingBalance, range.from, range.to, loadCashbook]);

    const unconfigured = accounts.filter(a => a.openingBalance === 0 && a.openingBalanceDate >= '2026-09-20');

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Money Accounts</h1>
                    <p className="text-sm text-gray-500">Where the department's money actually sits.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <RefreshCcw className="w-4 h-4" /> Refresh
                    </button>
                    <button
                        onClick={() => setMode({ kind: 'create' })}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-ministry-orange rounded-lg hover:opacity-90"
                    >
                        <Plus className="w-4 h-4" /> New Account
                    </button>
                </div>
            </div>

            {loadError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">Could not load accounts</p>
                        <p className="text-sm text-red-700">{loadError}</p>
                    </div>
                </div>
            )}

            {!isLoading && unconfigured.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-900">Opening balances have not been set</p>
                        <p className="text-sm text-amber-800 mt-0.5">
                            {unconfigured.map(a => a.name).join(', ')} {unconfigured.length === 1 ? 'is' : 'are'} still
                            opening at zero on {formatDate(unconfigured[0].openingBalanceDate)}. Until a physical count is
                            entered, balances read zero and any Cash or Mobile Money payment will be refused as
                            insufficient funds. Entries dated before the opening date are deliberately excluded.
                        </p>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading accounts…</div>
            ) : (
                <>
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-sm font-medium text-gray-500">Total Funds</p>
                        <h2 className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalFunds)}</h2>
                        <p className="text-xs text-gray-400 mt-1">Across {accounts.length} account{accounts.length === 1 ? '' : 's'}, including inactive.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {accounts.map(account => {
                            const Icon = TYPE_ICON[account.accountType] ?? Wallet;
                            const isSelected = selected?.id === account.id;
                            return (
                                <div
                                    key={account.id}
                                    className={`bg-white p-5 rounded-xl border shadow-sm transition-colors ${
                                        isSelected ? 'border-ministry-orange ring-2 ring-ministry-orange/20' : 'border-gray-100'
                                    } ${!account.isActive ? 'opacity-60' : ''}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className={`p-3 rounded-full ${TYPE_STYLE[account.accountType] ?? 'text-gray-600 bg-gray-100'}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <button
                                            onClick={() => setMode({ kind: 'edit', account })}
                                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                                            aria-label={`Edit ${account.name}`}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="mt-3 text-sm font-medium text-gray-500">
                                        {account.name}{!account.isActive && ' (inactive)'}
                                    </p>
                                    <h3 className={`text-2xl font-bold ${account.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {formatCurrency(account.balance)}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Opened {formatCurrency(account.openingBalance)} on {formatDate(account.openingBalanceDate)}
                                    </p>
                                    <button
                                        onClick={() => setSelectedId(isSelected ? null : account.id)}
                                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ministry-orange hover:underline"
                                    >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        {isSelected ? 'Hide cashbook' : 'View cashbook'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {selected && (
                        <CashbookPanel
                            account={selected}
                            cashbook={cashbook}
                            error={cashbookError}
                            isLoading={isCashbookLoading}
                            range={range}
                            onRangeChange={setRange}
                            onClose={() => setSelectedId(null)}
                        />
                    )}
                </>
            )}

            {mode.kind !== 'closed' && (
                <AccountModal
                    account={mode.kind === 'edit' ? mode.account : null}
                    onClose={() => setMode({ kind: 'closed' })}
                    onSaved={() => { setMode({ kind: 'closed' }); load(); }}
                />
            )}
        </div>
    );
};

const CashbookPanel: React.FC<{
    account: MoneyAccount;
    cashbook: Cashbook | null;
    error: string | null;
    isLoading: boolean;
    range: { from: string; to: string };
    onRangeChange: (r: { from: string; to: string }) => void;
    onClose: () => void;
}> = ({ account, cashbook, error, isLoading, range, onRangeChange, onClose }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100 flex-wrap">
            <div>
                <h3 className="text-lg font-bold text-gray-900">{account.name} — Daily Cashbook</h3>
                <p className="text-sm text-gray-500">Each day's opening balance, money in and out, and closing balance.</p>
            </div>
            <div className="flex items-end gap-3">
                <DateInput name="from" label="From" value={range.from} onChange={v => onRangeChange({ ...range, from: v })} className="w-40" />
                <DateInput name="to" label="To" value={range.to} onChange={v => onRangeChange({ ...range, to: v })} className="w-40" />
                <button onClick={onClose} className="p-2 mb-0.5 text-gray-400 hover:text-gray-700" aria-label="Close cashbook">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        {error && <div className="p-4 text-sm text-red-700 bg-red-50">{error}</div>}

        {cashbook?.period.clampedToOpeningDate && (
            <div className="px-5 py-3 text-xs text-amber-800 bg-amber-50 border-b border-amber-100">
                Showing from {formatDate(cashbook.period.from)} rather than {formatDate(cashbook.period.requestedFrom)} —
                entries before the opening balance date are excluded, because the opening balance is a physical count on
                that date and already contains them.
            </div>
        )}

        {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading cashbook…</div>
        ) : !cashbook ? null : cashbook.days.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
                No movement between {formatDate(cashbook.period.from)} and {formatDate(cashbook.period.to)}.
                <div className="text-xs text-gray-400 mt-1">Opening and closing balance: {formatCurrency(cashbook.openingBalance)}</div>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="text-left p-3 font-medium">Date</th>
                            <th className="text-right p-3 font-medium">Opening</th>
                            <th className="text-right p-3 font-medium">Sales</th>
                            <th className="text-right p-3 font-medium">Other In</th>
                            <th className="text-right p-3 font-medium">Transfers In</th>
                            <th className="text-right p-3 font-medium">Expenses</th>
                            <th className="text-right p-3 font-medium">Suppliers</th>
                            <th className="text-right p-3 font-medium">Refunds</th>
                            <th className="text-right p-3 font-medium">Other Out</th>
                            <th className="text-right p-3 font-medium">Transfers Out</th>
                            <th className="text-right p-3 font-medium">Closing</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {cashbook.days.map(day => (
                            <tr key={day.date} className="hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900 whitespace-nowrap">{formatDate(day.date)}</td>
                                <td className="p-3 text-right text-gray-500">{formatCurrency(day.openingBalance)}</td>
                                <td className="p-3 text-right text-green-700">{day.salesIn ? formatCurrency(day.salesIn) : '—'}</td>
                                <td className="p-3 text-right text-green-700">{day.otherIn ? formatCurrency(day.otherIn) : '—'}</td>
                                <td className="p-3 text-right text-green-700">{day.transfersIn ? formatCurrency(day.transfersIn) : '—'}</td>
                                <td className="p-3 text-right text-red-700">{day.expensesOut ? formatCurrency(day.expensesOut) : '—'}</td>
                                <td className="p-3 text-right text-red-700">{day.supplierPaymentsOut ? formatCurrency(day.supplierPaymentsOut) : '—'}</td>
                                <td className="p-3 text-right text-red-700">{day.refundsOut ? formatCurrency(day.refundsOut) : '—'}</td>
                                <td className="p-3 text-right text-red-700">{day.otherOut ? formatCurrency(day.otherOut) : '—'}</td>
                                <td className="p-3 text-right text-red-700">{day.transfersOut ? formatCurrency(day.transfersOut) : '—'}</td>
                                <td className={`p-3 text-right font-semibold ${day.closingBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                    {formatCurrency(day.closingBalance)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold text-gray-900">
                        <tr>
                            <td className="p-3">Closing balance</td>
                            <td colSpan={9} />
                            <td className={`p-3 text-right ${cashbook.closingBalance < 0 ? 'text-red-600' : ''}`}>
                                {formatCurrency(cashbook.closingBalance)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        )}
    </div>
);

const AccountModal: React.FC<{
    account: MoneyAccount | null;
    onClose: () => void;
    onSaved: () => void;
}> = ({ account, onClose, onSaved }) => {
    const isEdit = account !== null;
    const [name, setName] = useState(account?.name ?? '');
    const [accountType, setAccountType] = useState(account?.accountType ?? 'CASH');
    const [provider, setProvider] = useState(account?.provider ?? '');
    const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? '');
    const [openingBalance, setOpeningBalance] = useState<number | null>(account?.openingBalance ?? 0);
    const [openingBalanceDate, setOpeningBalanceDate] = useState(account?.openingBalanceDate ?? getKampalaToday());
    const [isActive, setIsActive] = useState(account?.isActive ?? true);

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Client-side validation mirrors the server's rules so a mistake is caught
     * before a round trip. It is not a substitute for them: the backend
     * validates independently and is the authority.
     */
    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        if (!name.trim()) errors.name = 'Is required';
        if (!isEdit && !accountType) errors.accountType = 'Is required';
        if (openingBalance === null || !Number.isInteger(openingBalance) || openingBalance < 0) {
            errors.openingBalance = 'Must be a whole number of shillings, zero or more';
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(openingBalanceDate)) {
            errors.openingBalanceDate = 'Must be a valid date';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const save = async () => {
        setFormError(null);
        if (!validate()) return;
        setIsSaving(true);

        const res = isEdit
            ? await accountService.updateAccount(account!.id, {
                name: name.trim(),
                provider: provider || null,
                accountNumber: accountNumber || null,
                openingBalance: openingBalance!,
                openingBalanceDate,
                isActive
            })
            : await accountService.createAccount({
                name: name.trim(),
                accountType,
                provider: provider || null,
                accountNumber: accountNumber || null,
                openingBalance: openingBalance!,
                openingBalanceDate
            });

        setIsSaving(false);
        if (res.status === 'error') { setFormError(res.message); return; }
        onSaved();
    };

    const openingChanged = isEdit && (
        openingBalance !== account!.openingBalance || openingBalanceDate !== account!.openingBalanceDate
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">{isEdit ? `Edit ${account!.name}` : 'New Money Account'}</h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <TextInput name="name" label="Account name" required value={name} onChange={setName} error={fieldErrors.name} />

                    <SelectInput
                        name="accountType"
                        label="Account type"
                        required
                        value={accountType}
                        onChange={v => setAccountType(v as MoneyAccount['accountType'])}
                        options={ACCOUNT_TYPE_OPTIONS}
                        error={fieldErrors.accountType}
                        disabled={isEdit}
                        hint={isEdit
                            ? 'Type cannot be changed: it decides whether the account may go negative, and changing it would reinterpret history.'
                            : 'Cash and Mobile Money accounts are blocked from going negative. Bank accounts are allowed to.'}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <TextInput name="provider" label="Provider" value={provider} onChange={setProvider} placeholder="MTN, Airtel, bank name" />
                        <TextInput name="accountNumber" label="Account / phone number" value={accountNumber} onChange={setAccountNumber} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <NumberInput
                            name="openingBalance"
                            label="Opening balance"
                            required
                            format="currency"
                            integerOnly
                            min={0}
                            value={openingBalance}
                            onChange={setOpeningBalance}
                            error={fieldErrors.openingBalance}
                        />
                        <DateInput
                            name="openingBalanceDate"
                            label="Opening balance date"
                            required
                            value={openingBalanceDate}
                            onChange={setOpeningBalanceDate}
                            error={fieldErrors.openingBalanceDate}
                        />
                    </div>

                    <p className="text-xs text-gray-500">
                        The opening balance is a physical count on its date. Ledger entries before that date are excluded
                        from the balance, because the count already contains them.
                    </p>

                    {openingChanged && (
                        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-900">
                                Changing the opening balance or its date restates every balance this account has ever
                                reported, including the ones already enforced against when accepting or refusing payments.
                            </p>
                        </div>
                    )}

                    {isEdit && (
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded border-gray-300" />
                            Active
                        </label>
                    )}

                    {formError && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{formError}</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={save}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-semibold text-white bg-ministry-orange rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                        {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create account'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoneyAccountsPage;
