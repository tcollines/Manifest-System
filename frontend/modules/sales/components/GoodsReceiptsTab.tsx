import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, PackageCheck, RefreshCcw } from 'lucide-react';
import {
    goodsReceiptService,
    GoodsReceipt,
    PaymentTerms
} from '../../../services/sales/goodsReceiptService';
import { SalesSupplier } from '../types';
import { DateInput, SelectInput } from '../../../components/inputs';
import { formatCurrency, formatDate } from '../../../shared/formatters';

/**
 * Goods receipts (GRN) list.
 *
 * Read-only for now. Recording a receipt is a separate pass: the POST endpoint
 * exists but the form belongs with the stock side of procurement, and the list
 * is the half that makes the already-built endpoint useful.
 *
 * Paid and balance come from the backend's computed `totalPaid` / `balance`.
 * They are NOT derived here from `amountPaidOnReceipt`, which the RPC also
 * writes as a payment row — adding the two double-counts.
 */

const TERMS_LABEL: Record<PaymentTerms, string> = {
    PAID: 'Paid',
    CREDIT: 'Credit',
    PART_PAID: 'Part paid'
};

const TERMS_STYLE: Record<PaymentTerms, string> = {
    PAID: 'bg-green-100 text-green-700',
    CREDIT: 'bg-red-100 text-red-700',
    PART_PAID: 'bg-orange-100 text-orange-700'
};

const TermsBadge: React.FC<{ terms: PaymentTerms }> = ({ terms }) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TERMS_STYLE[terms] ?? 'bg-gray-100 text-gray-700'}`}>
        {TERMS_LABEL[terms] ?? terms}
    </span>
);

interface Props {
    suppliers: SalesSupplier[];
}

export const GoodsReceiptsTab: React.FC<Props> = ({ suppliers }) => {
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Empty strings mean "no filter" — they are dropped rather than sent, so
    // the backend's date validation never sees a blank it would reject.
    const [filters, setFilters] = useState({ supplierId: '', from: '', to: '' });

    const load = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        const res = await goodsReceiptService.getGoodsReceipts({
            supplierId: filters.supplierId || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
            limit: 100
        });
        // Always handle the error branch — EXECUTION_GUIDE step 7.
        if (res.status === 'error') { setLoadError(res.message); setReceipts([]); }
        else setReceipts(res.data);
        setIsLoading(false);
    }, [filters.supplierId, filters.from, filters.to]);

    useEffect(() => { load(); }, [load]);

    const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));
    const hasFilters = Boolean(filters.supplierId || filters.from || filters.to);

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
                <SelectInput
                    name="grnSupplier"
                    label="Supplier"
                    value={filters.supplierId}
                    onChange={v => setFilters(f => ({ ...f, supplierId: v }))}
                    options={supplierOptions}
                    placeholder="All suppliers"
                    className="w-full sm:w-64"
                />
                <DateInput
                    name="grnFrom"
                    label="Received from"
                    value={filters.from}
                    onChange={v => setFilters(f => ({ ...f, from: v }))}
                    className="w-full sm:w-44"
                />
                <DateInput
                    name="grnTo"
                    label="Received to"
                    value={filters.to}
                    onChange={v => setFilters(f => ({ ...f, to: v }))}
                    className="w-full sm:w-44"
                />
                <button
                    onClick={() => setFilters({ supplierId: '', from: '', to: '' })}
                    className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    Clear
                </button>
                <button
                    onClick={load}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    <RefreshCcw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {loadError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">Could not load goods receipts</p>
                        <p className="text-sm text-red-700">{loadError}</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm w-full overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading goods receipts…</div>
                ) : receipts.length === 0 ? (
                    <div className="p-10 text-center">
                        <PackageCheck className="w-8 h-8 text-gray-300 mx-auto" />
                        <p className="mt-2 text-sm font-medium text-gray-600">No goods receipts found</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {hasFilters
                                ? 'Nothing matches these filters. Clear them to see every receipt.'
                                : 'Receipts appear here once stock is recorded as received against a supplier.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left min-w-[860px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                                        <th className="p-4 w-10" />
                                        <th className="p-4">GRN</th>
                                        <th className="p-4">Supplier</th>
                                        <th className="p-4">Received</th>
                                        <th className="p-4">Terms</th>
                                        <th className="p-4 text-right">Total</th>
                                        <th className="p-4 text-right">Paid</th>
                                        <th className="p-4 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {receipts.map(r => {
                                        const isExpanded = expandedId === r.id;
                                        return (
                                            <React.Fragment key={r.id}>
                                                <tr
                                                    className="hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                                >
                                                    <td className="p-4 text-gray-400">
                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </td>
                                                    <td className="p-4 font-mono font-medium text-gray-900">{r.grnNumber}</td>
                                                    <td className="p-4 font-medium text-gray-700">{r.supplierName ?? '—'}</td>
                                                    <td className="p-4 text-gray-500 whitespace-nowrap">{formatDate(r.receivedDate)}</td>
                                                    <td className="p-4"><TermsBadge terms={r.paymentTerms} /></td>
                                                    <td className="p-4 text-right font-medium text-gray-900">{formatCurrency(r.totalCost)}</td>
                                                    <td className="p-4 text-right text-green-700">{formatCurrency(r.totalPaid)}</td>
                                                    <td className={`p-4 text-right font-bold ${r.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                        {formatCurrency(r.balance)}
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-gray-50/70">
                                                        <td />
                                                        <td colSpan={7} className="px-4 pb-4">
                                                            <ReceiptDetail receipt={r} />
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="md:hidden divide-y divide-gray-100">
                            {receipts.map(r => {
                                const isExpanded = expandedId === r.id;
                                return (
                                    <div key={r.id} className="p-4">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                            className="w-full text-left"
                                        >
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-mono font-semibold text-gray-900">{r.grnNumber}</div>
                                                    <div className="text-sm text-gray-600 truncate">{r.supplierName ?? '—'}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5">{formatDate(r.receivedDate)}</div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <TermsBadge terms={r.paymentTerms} />
                                                    <div className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(r.totalCost)}</div>
                                                    <div className={`text-xs font-bold ${r.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                        {formatCurrency(r.balance)} due
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                        {isExpanded && <div className="mt-3"><ReceiptDetail receipt={r} /></div>}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const ReceiptDetail: React.FC<{ receipt: GoodsReceipt }> = ({ receipt }) => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
            <span>Delivery note: <span className="text-gray-800 font-medium">{receipt.deliveryNoteNumber || '—'}</span></span>
            <span>Paid on receipt: <span className="text-gray-800 font-medium">{formatCurrency(receipt.amountPaidOnReceipt)}</span></span>
            <span>Recorded by: <span className="text-gray-800 font-medium">{receipt.createdBy || '—'}</span></span>
            {receipt.notes && <span className="w-full">Notes: <span className="text-gray-800">{receipt.notes}</span></span>}
        </div>
        {receipt.items.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">This receipt has no lines.</div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="text-left p-3 font-medium">Item</th>
                            <th className="text-left p-3 font-medium">SKU</th>
                            <th className="text-right p-3 font-medium">Qty</th>
                            <th className="text-right p-3 font-medium">Unit cost</th>
                            <th className="text-right p-3 font-medium">Line total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {receipt.items.map(item => (
                            <tr key={item.id}>
                                <td className="p-3 font-medium text-gray-900">{item.variantName ?? '—'}</td>
                                <td className="p-3 font-mono text-xs text-gray-500">{item.sku ?? '—'}</td>
                                <td className="p-3 text-right text-gray-700">{item.quantity}</td>
                                <td className="p-3 text-right text-gray-700">{formatCurrency(item.unitCost)}</td>
                                <td className="p-3 text-right font-medium text-gray-900">{formatCurrency(item.lineCost)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

export default GoodsReceiptsTab;
