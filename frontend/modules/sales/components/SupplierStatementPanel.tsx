import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
    supplierStatementService,
    SupplierStatement
} from '../../../services/sales/supplierStatementService';
import { SalesSupplier } from '../types';
import { DateInput } from '../../../components/inputs';
import { formatCurrency, formatDate } from '../../../shared/formatters';

/**
 * Running statement for one supplier: goods receipts as debits, payments as
 * credits, a running balance, and ageing of what is still outstanding.
 *
 * `diagnostics` is surfaced, not hidden. `openingBalanceReceiptMissing` means
 * credit exists that no receipt accounts for, so the ageing UNDERSTATES the
 * debt — a statement that quietly shows a wrong ageing is the failure mode that
 * flag exists to prevent.
 *
 * A positive balance is owed TO the supplier. A negative one means the supplier
 * has been paid more than the documents show, which is reported honestly rather
 * than clamped: before the cut-over enters opening-balance GRNs, historical
 * payments have no matching debit.
 */

const LINE_TYPE_LABEL: Record<SupplierStatement['lines'][number]['type'], string> = {
    GOODS_RECEIPT: 'Goods receipt',
    PAYMENT: 'Payment'
};

interface Props {
    supplier: SalesSupplier;
    onClose: () => void;
}

export const SupplierStatementPanel: React.FC<Props> = ({ supplier, onClose }) => {
    const [statement, setStatement] = useState<SupplierStatement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Blank means the whole history, which is the useful default for a
    // statement — a date window is opt-in.
    const [range, setRange] = useState({ from: '', to: '' });

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const res = await supplierStatementService.getStatement(supplier.id, {
            from: range.from || undefined,
            to: range.to || undefined
        });
        // Always handle the error branch — EXECUTION_GUIDE step 7.
        if (res.status === 'error') { setError(res.message); setStatement(null); }
        else setStatement(res.data);
        setIsLoading(false);
    }, [supplier.id, range.from, range.to]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100 flex-wrap">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">{supplier.name} — Statement</h3>
                    <p className="text-sm text-gray-500">
                        Goods received, payments made, and what is still outstanding.
                    </p>
                </div>
                <div className="flex items-end gap-3">
                    <DateInput
                        name="statementFrom"
                        label="From"
                        value={range.from}
                        onChange={v => setRange(r => ({ ...r, from: v }))}
                        className="w-40"
                    />
                    <DateInput
                        name="statementTo"
                        label="To"
                        value={range.to}
                        onChange={v => setRange(r => ({ ...r, to: v }))}
                        className="w-40"
                    />
                    <button
                        onClick={onClose}
                        className="p-2 mb-0.5 text-gray-400 hover:text-gray-700"
                        aria-label="Close statement"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border-b border-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">Could not load the statement</p>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading statement…</div>
            ) : !statement ? null : (
                <>
                    {statement.diagnostics.openingBalanceReceiptMissing && (
                        <div className="flex items-start gap-3 px-5 py-4 bg-amber-50 border-b border-amber-100">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-900">
                                    Ageing understates what is owed
                                </p>
                                <p className="text-sm text-amber-800 mt-0.5">
                                    {formatCurrency(statement.diagnostics.unallocatedCredit)} of payments cannot be
                                    matched to any goods receipt, so the debit side of those payments is missing.
                                    The ageing below only ages receipts that exist. Enter an opening-balance goods
                                    receipt for this supplier to correct it.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100 border-b border-gray-100">
                        <Summary label="Opening balance" value={statement.openingBalance} />
                        <Summary label="Closing balance" value={statement.closingBalance} emphasise />
                        <Summary label="Outstanding (aged)" value={statement.ageing.total} />
                        <Summary label="Unallocated credit" value={statement.diagnostics.unallocatedCredit} />
                    </div>

                    <div className="px-5 py-4 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Ageing as at {formatDate(statement.period.asOf)}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Bucket label="Current (0–30 days)" value={statement.ageing.current} />
                            <Bucket label="31–60 days" value={statement.ageing.days31to60} />
                            <Bucket label="Over 60 days" value={statement.ageing.days60Plus} warn />
                            <Bucket label="Total outstanding" value={statement.ageing.total} />
                        </div>
                    </div>

                    {statement.lines.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-sm font-medium text-gray-600">No entries in this period</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Opening and closing balance: {formatCurrency(statement.openingBalance)}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[720px]">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Date</th>
                                        <th className="text-left p-3 font-medium">Type</th>
                                        <th className="text-left p-3 font-medium">Reference</th>
                                        <th className="text-left p-3 font-medium">Description</th>
                                        <th className="text-right p-3 font-medium">Debit</th>
                                        <th className="text-right p-3 font-medium">Credit</th>
                                        <th className="text-right p-3 font-medium">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr className="bg-gray-50/60 text-gray-600">
                                        <td className="p-3 font-medium" colSpan={6}>Opening balance</td>
                                        <td className="p-3 text-right font-semibold">
                                            {formatCurrency(statement.openingBalance)}
                                        </td>
                                    </tr>
                                    {statement.lines.map((line, i) => (
                                        <tr key={`${line.date}-${line.reference ?? i}-${i}`} className="hover:bg-gray-50">
                                            <td className="p-3 whitespace-nowrap text-gray-900 font-medium">
                                                {formatDate(line.date)}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    line.type === 'GOODS_RECEIPT'
                                                        ? 'bg-indigo-100 text-indigo-700'
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {LINE_TYPE_LABEL[line.type]}
                                                </span>
                                            </td>
                                            <td className="p-3 font-mono text-xs text-gray-500">{line.reference || '—'}</td>
                                            <td className="p-3 text-gray-600">{line.description}</td>
                                            <td className="p-3 text-right text-gray-900">
                                                {line.debit ? formatCurrency(line.debit) : '—'}
                                            </td>
                                            <td className="p-3 text-right text-green-700">
                                                {line.credit ? formatCurrency(line.credit) : '—'}
                                            </td>
                                            <td className={`p-3 text-right font-semibold ${
                                                line.balance < 0 ? 'text-red-600' : 'text-gray-900'
                                            }`}>
                                                {formatCurrency(line.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-semibold text-gray-900">
                                    <tr>
                                        <td className="p-3" colSpan={6}>Closing balance</td>
                                        <td className={`p-3 text-right ${statement.closingBalance < 0 ? 'text-red-600' : ''}`}>
                                            {formatCurrency(statement.closingBalance)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 flex flex-wrap gap-x-6 gap-y-1">
                        <span>{statement.diagnostics.goodsReceiptCount} goods receipt{statement.diagnostics.goodsReceiptCount === 1 ? '' : 's'}</span>
                        <span>{statement.diagnostics.paymentCount} payment{statement.diagnostics.paymentCount === 1 ? '' : 's'}</span>
                        <span>{statement.diagnostics.paymentsNotLinkedToGoodsReceipt} not linked to a goods receipt</span>
                        {statement.closingBalance < 0 && (
                            <span className="text-amber-700">
                                Negative balance: more has been paid than the documents record.
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const Summary: React.FC<{ label: string; value: number; emphasise?: boolean }> = ({ label, value, emphasise }) => (
    <div className="bg-white p-4">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className={`mt-1 font-bold ${emphasise ? 'text-xl' : 'text-lg'} ${value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(value)}
        </p>
    </div>
);

const Bucket: React.FC<{ label: string; value: number; warn?: boolean }> = ({ label, value, warn }) => (
    <div className={`p-3 rounded-lg border ${warn && value > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-bold mt-0.5 ${warn && value > 0 ? 'text-red-700' : 'text-gray-900'}`}>
            {formatCurrency(value)}
        </p>
    </div>
);

export default SupplierStatementPanel;
