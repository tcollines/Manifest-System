/**
 * ExpensesTab
 *
 * Displays expenditure transactions for the selected event.
 * Consumes shared state via useFinance() — no props.
 */

import React from 'react';
import { useFinance } from '../FinanceContext';
import { CreditCard, Plus, ArrowUpRight } from 'lucide-react';

const ExpensesTab: React.FC = () => {
    const { transactions, formatMoney, setShowTransModal } = useFinance();

    const expenseTransactions = transactions.filter(t => t.type === 'Expense');
    const total = expenseTransactions.reduce((s, t) => s + t.amount, 0);

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-red-600" />
                    <h2 className="text-xl font-bold text-gray-800">Expenditure Log</h2>
                    <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{expenseTransactions.length} records</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase">Total Expenditure</p>
                        <p className="text-2xl font-black text-red-600">{formatMoney(total)}</p>
                    </div>
                    <button
                        onClick={() => setShowTransModal(true)}
                        className="flex items-center gap-2 bg-ministry-text text-white px-4 py-2.5 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg text-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Expense
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {expenseTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-400">
                                        <ArrowUpRight className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        No expense records for this event.
                                    </td>
                                </tr>
                            ) : (
                                expenseTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-mono text-gray-500">{t.date}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">{t.category}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{t.description}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{t.method || 'Cash'}</td>
                                        <td className="px-6 py-4 text-right font-bold text-red-600">{formatMoney(t.amount)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {expenseTransactions.length > 0 && (
                            <tfoot className="bg-red-50 border-t-2 border-red-200">
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 font-bold text-gray-700 uppercase text-sm">Total Expenditure</td>
                                    <td className="px-6 py-4 text-right font-black text-red-600 text-lg">{formatMoney(total)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExpensesTab;
