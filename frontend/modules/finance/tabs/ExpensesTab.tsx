/**
 * ExpensesTab
 *
 * Displays expenditure transactions for the selected event.
 * Consumes shared state via useFinance() — no props.
 */

import React, { useState } from 'react';
import { useFinance } from '../FinanceContext';
import { CreditCard, Plus, ArrowUpRight } from 'lucide-react';

const ExpensesTab: React.FC = () => {
    const { transactions, formatMoney, setShowTransModal } = useFinance();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const expenseTransactions = transactions.filter(t => t.type === 'Expense');
    const total = expenseTransactions.reduce((s, t) => s + t.amount, 0);

    const totalTransactions = expenseTransactions.length;
    const paginatedExpenses = expenseTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 md:px-6 pt-4 md:pt-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 rounded-full">
                        <CreditCard className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            Expenses
                            <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{totalTransactions}</span>
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">Total: <span className="font-bold text-red-600">{formatMoney(total)}</span></p>
                    </div>
                </div>
                <div className="w-full md:w-auto">
                    <button
                        onClick={() => setShowTransModal(true)}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-ministry-text text-white px-4 py-2.5 rounded-lg font-bold hover:bg-ministry-orange transition-colors shadow-sm text-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Expense
                    </button>
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

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-b-xl shadow-sm flex flex-col max-h-[70vh]">
                    <div className="overflow-x-auto overflow-y-auto flex-1 hide-scrollbar">
                        <table className="w-full text-left min-w-[800px] relative">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200 sticky top-0 z-20 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Method</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-gray-400">
                                            <ArrowUpRight className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                            No expense records found.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedExpenses.map(t => (
                                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-mono text-gray-500 whitespace-nowrap">{t.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">{t.category}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 min-w-[200px]">{t.description}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{t.method || 'Cash'}</td>
                                            <td className="px-6 py-4 text-right font-bold text-red-600 whitespace-nowrap">{formatMoney(t.amount)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {paginatedExpenses.length > 0 && (
                                <tfoot className="bg-red-50/50 sticky bottom-0 z-10 border-t border-gray-200 shadow-sm">
                                    <tr>
                                        <td colSpan={4} className="px-6 py-3 font-bold text-gray-700 uppercase text-xs">Page Total</td>
                                        <td className="px-6 py-3 text-right font-black text-red-600 text-sm">
                                            {formatMoney(paginatedExpenses.reduce((s, t) => s + t.amount, 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpensesTab;
