import React from 'react';
import { CampusFinance } from '../../types';
import { Plus } from 'lucide-react';
import { useNotification } from '../ui/NotificationSystem';

interface FinanceTabProps {
    financeRecords: CampusFinance[];
}

export const FinanceTab: React.FC<FinanceTabProps> = ({ financeRecords }) => {
    const { showToast } = useNotification();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-ministry-text">Finance Records</h3>
                <button
                    onClick={() => {
                        showToast("Finance entry managed via Finance Department", 'info');
                    }}
                    className="flex items-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded font-medium hover:bg-ministry-orange transition-colors"
                >
                    <Plus size={16} />
                    <span>Request Entry</span>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                            <th className="p-4 font-medium">Date</th>
                            <th className="p-4 font-medium">Category</th>
                            <th className="p-4 font-medium">Description</th>
                            <th className="p-4 font-medium text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {financeRecords.map(rec => (
                            <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                <td className="p-4">{new Date(rec.date).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${rec.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {rec.category}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600">{rec.description}</td>
                                <td className="p-4 text-right font-bold text-gray-900">
                                    {rec.type === 'Expense' ? '-' : '+'}{Number(rec.amount).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {financeRecords.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-10 text-gray-400">No finance records found for this scope.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
