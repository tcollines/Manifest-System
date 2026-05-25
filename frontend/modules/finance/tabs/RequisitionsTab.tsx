/**
 * RequisitionsTab
 *
 * Displays department requisitions with pending/paid sub-tabs.
 * Payment modal is hosted in FinanceLayout; this tab only triggers it.
 * Consumes shared state via useFinance() — no props.
 */

import React, { useState, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { FileText, CheckCircle } from 'lucide-react';
import { REQUISITION_STATUS } from '../../../shared/constants';
import { StatusBadge } from '../../../components/ui/StatusBadge';

const RequisitionsTab: React.FC = () => {
    const { requisitions, formatMoney, handleOpenPaymentModal } = useFinance();
    const { showToast } = useNotification();
    const [subTab, setSubTab] = useState<'Pending' | 'Paid'>('Pending');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Reset page when tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [subTab]);

    const pendingItems = requisitions.filter(r => r.status === REQUISITION_STATUS.FINANCE_BATCH);
    const paidItems = requisitions.filter(r => r.status === REQUISITION_STATUS.PAID);

    const activeItems = subTab === 'Pending' ? pendingItems : paidItems;
    const totalTransactions = activeItems.length;
    const paginatedItems = activeItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 md:px-6 pt-4 md:pt-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-50 rounded-full">
                        <FileText className="w-6 h-6 text-ministry-orange" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            Requisitions
                        </h2>
                    </div>
                </div>
                <div className="w-full md:w-auto">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-full">
                        <button
                            onClick={() => setSubTab('Pending')}
                            className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-all ${subTab === 'Pending' ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Pending
                            {pendingItems.length > 0 && (
                                <span className="ml-1.5 bg-ministry-orange text-white text-xs font-bold rounded-full px-1.5 py-0.5">{pendingItems.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setSubTab('Paid')}
                            className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-all ${subTab === 'Paid' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Paid
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 md:px-6 pb-6">
                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 rounded-t-xl border border-gray-200 border-b-0 shadow-sm sticky top-0 z-10 gap-3 sm:gap-0">
                    <div>
                        <span className="text-sm text-gray-600">Showing </span>
                        <span className="font-bold text-gray-900">
                            {totalTransactions > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalTransactions)}
                        </span>
                        <span className="text-sm text-gray-600"> of {totalTransactions} records</span>
                    </div>
                    <div className="flex space-x-2 w-full sm:w-auto">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="flex-1 sm:flex-none px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-gray-700 transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            disabled={currentPage * itemsPerPage >= totalTransactions}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-gray-700 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-b-xl shadow-sm flex flex-col max-h-[70vh]">
                    <div className="overflow-x-auto overflow-y-auto flex-1 hide-scrollbar p-4">
                        {/* Pending Sub-Tab */}
                        {subTab === 'Pending' && (
                            <div className="grid grid-cols-1 gap-4">
                                {paginatedItems.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-white">
                                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        No pending requisitions to process.
                                    </div>
                                ) : (
                                    paginatedItems.map(req => {
                                        const percentPaid = Math.min(100, Math.round(((req.amountPaid || 0) / req.totalAmount) * 100));
                                        return (
                                            <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-ministry-orange/30 hover:shadow-md transition-all shadow-sm">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">{req.departmentId}</span>
                                                            <span className="text-xs font-mono text-gray-400">{req.requisitionNumber}</span>
                                                            <StatusBadge status={req.status as any} />
                                                        </div>
                                                        <h4 className="text-lg font-bold text-gray-900">{req.title}</h4>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Amount</p>
                                                        <p className="text-xl font-black text-gray-900">{formatMoney(req.totalAmount)}</p>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="mb-4">
                                                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                                        <span>Paid: {formatMoney(req.amountPaid || 0)}</span>
                                                        <span>Balance: {formatMoney(req.totalAmount - (req.amountPaid || 0))}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                        <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentPaid}%` }} />
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                                    <button
                                                        onClick={() => showToast(`Items:\n${req.items?.map((i: any) => `- ${i.description} (${i.quantity} x ${i.unitCost})`).join('\n')}`, 'info')}
                                                        className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
                                                    >
                                                        <FileText className="w-4 h-4" /> View Items
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenPaymentModal(req)}
                                                        className="bg-ministry-text text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-ministry-orange transition-colors shadow-lg"
                                                    >
                                                        {req.amountPaid && req.amountPaid > 0 ? 'Clear Balance' : 'Process Payment'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* Paid Sub-Tab */}
                        {subTab === 'Paid' && (
                            <div className="grid grid-cols-1 gap-4">
                                {paginatedItems.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-white">
                                        No paid requisitions history.
                                    </div>
                                ) : (
                                    paginatedItems.map(req => (
                                        <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 opacity-80 hover:opacity-100 transition-opacity">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge status={req.status as any} />
                                                    <h4 className="text-lg font-bold text-gray-400 line-through">{req.title}</h4>
                                                </div>
                                                <p className="text-lg font-black text-green-600">{formatMoney(req.totalAmount)}</p>
                                            </div>
                                            <div className="flex justify-between items-center text-sm text-gray-500">
                                                <span>{req.departmentId} • {req.requisitionNumber}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequisitionsTab;
