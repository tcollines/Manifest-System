/**
 * RequisitionsTab
 *
 * Displays department requisitions with pending/paid sub-tabs.
 * Payment modal is hosted in FinanceLayout; this tab only triggers it.
 * Consumes shared state via useFinance() — no props.
 */

import React, { useState } from 'react';
import { useFinance } from '../FinanceContext';
import { FileText, CheckCircle } from 'lucide-react';

const RequisitionsTab: React.FC = () => {
    const { requisitions, formatMoney, handleOpenPaymentModal, showToast } = useFinance();
    const [subTab, setSubTab] = useState<'Pending' | 'Paid'>('Pending');

    const pendingItems = requisitions.filter(r => r.status === 'Pending Finance');
    const paidItems = requisitions.filter(r => r.status === 'Paid');

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-ministry-orange" />
                    <h2 className="text-xl font-bold text-gray-800">Department Requisitions</h2>
                </div>
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setSubTab('Pending')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${subTab === 'Pending' ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Pending Processing
                        {pendingItems.length > 0 && (
                            <span className="ml-2 bg-ministry-orange text-white text-xs font-bold rounded-full px-1.5 py-0.5">{pendingItems.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setSubTab('Paid')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${subTab === 'Paid' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Approved & Paid
                    </button>
                </div>
            </div>

            {/* Pending Sub-Tab */}
            {subTab === 'Pending' && (
                <div className="grid grid-cols-1 gap-4">
                    {pendingItems.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-white">
                            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            No pending requisitions to process.
                        </div>
                    ) : (
                        pendingItems.map(req => {
                            const percentPaid = Math.min(100, Math.round(((req.amountPaid || 0) / req.totalAmount) * 100));
                            return (
                                <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-ministry-orange/30 hover:shadow-md transition-all shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">{req.departmentId}</span>
                                                <span className="text-xs font-mono text-gray-400">{req.requisitionNumber}</span>
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
                    {paidItems.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-white">
                            No paid requisitions history.
                        </div>
                    ) : (
                        paidItems.map(req => (
                            <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 opacity-80 hover:opacity-100 transition-opacity">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-green-100 text-green-700 p-1 rounded-full"><CheckCircle className="w-4 h-4" /></span>
                                        <h4 className="text-lg font-bold text-gray-400 line-through">{req.title}</h4>
                                    </div>
                                    <p className="text-lg font-black text-green-600">{formatMoney(req.totalAmount)}</p>
                                </div>
                                <div className="flex justify-between items-center text-sm text-gray-500">
                                    <span>{req.departmentId} • {req.requisitionNumber}</span>
                                    <span className="text-green-600 font-bold">Fully Paid</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default RequisitionsTab;
