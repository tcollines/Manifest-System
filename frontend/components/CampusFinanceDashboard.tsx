import React, { useState, useEffect } from 'react';
import { User, CampusFinance } from '../types';
import { Save, Plus, X, DollarSign, Edit2, Trash2 } from 'lucide-react';
import { CampusStore } from '../database/campusStore';
import { useNotification } from './ui/NotificationSystem';

interface CampusFinanceDashboardProps {
    currentUser: User;
}

export default function CampusFinanceDashboard({ currentUser }: CampusFinanceDashboardProps) {
    const { showToast } = useNotification();

    // Modal State
    const [isAddingFinance, setIsAddingFinance] = useState(false);
    const [newFinance, setNewFinance] = useState<Partial<CampusFinance>>({});

    // Dashboard Data State
    const [financeRecords, setFinanceRecords] = useState<CampusFinance[]>([]);

    useEffect(() => {
        fetchFinance();
    }, []);

    const fetchFinance = async () => {
        try {
            const fetchedFinance = await CampusStore.getFinanceRecords();
            if (fetchedFinance) {
                setFinanceRecords(fetchedFinance);
            }
        } catch (e) {
            console.error('Failed to fetch campus finance', e);
        }
    };

    const handleSubmitFinance = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...newFinance,
                recordedBy: currentUser.name
            };

            if (newFinance.id) {
                await CampusStore.updateFinanceRecord(newFinance.id, payload);
                showToast("Finance record updated successfully");
            } else {
                await CampusStore.createFinanceRecord(payload);
                showToast("Finance record saved successfully");
            }

            setIsAddingFinance(false);
            fetchFinance();
        } catch (error) {
            console.error("Error saving finance record:", error);
            showToast("Failed to save finance record", 'error');
        }
    };

    const handleDeleteFinance = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this finance record?")) {
            try {
                await CampusStore.deleteFinanceRecord(id);
                showToast("Finance record deleted successfully");
                fetchFinance();
            } catch (error) {
                console.error("Error deleting finance record:", error);
                showToast("Failed to delete finance record", 'error');
            }
        }
    };

    const handleEditFinance = (record: CampusFinance, e: React.MouseEvent) => {
        e.stopPropagation();
        setNewFinance(record);
        setIsAddingFinance(true);
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-ministry-text">Departmental Finance</h1>
                    <p className="text-ministry-muted mt-2">Manage campus income and expenditures</p>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-green-50/50 border border-green-100 p-4 rounded-xl flex items-center space-x-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm border border-green-50">
                        <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Received</p>
                        <p className="text-xl font-bold text-gray-900">
                            UGX {financeRecords.filter(f => f.type === 'Income').reduce((sum, f) => sum + f.amount, 0).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl flex items-center space-x-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm border border-red-50">
                        <DollarSign className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Spent</p>
                        <p className="text-xl font-bold text-gray-900">
                            UGX {financeRecords.filter(f => f.type === 'Expense').reduce((sum, f) => sum + f.amount, 0).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center space-x-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm border border-blue-50">
                        <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Balance</p>
                        <p className="text-xl font-bold text-gray-900">
                            UGX {(
                                financeRecords.filter(f => f.type === 'Income').reduce((sum, f) => sum + f.amount, 0) -
                                financeRecords.filter(f => f.type === 'Expense').reduce((sum, f) => sum + f.amount, 0)
                            ).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
                <div className="overflow-x-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-ministry-text">Finance Records</h3>
                        <button
                            onClick={() => {
                                setNewFinance({ date: new Date().toISOString().split('T')[0], type: 'Expense', amount: 0, category: '', description: '', method: 'Cash' });
                                setIsAddingFinance(true);
                            }}
                            className="flex items-center space-x-2 bg-ministry-orange text-white px-4 py-2 rounded font-medium hover:bg-ministry-orange/90 transition-colors"
                        >
                            <Plus size={16} />
                            <span>Add Record</span>
                        </button>
                    </div>
                    {financeRecords.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg">No finance records yet.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                                    <th className="p-4 font-medium rounded-tl-lg">Date</th>
                                    <th className="p-4 font-medium">Type</th>
                                    <th className="p-4 font-medium">Category</th>
                                    <th className="p-4 font-medium">Amount</th>
                                    <th className="p-4 font-medium">Description</th>
                                    <th className="p-4 font-medium">Recorded By</th>
                                    <th className="p-4 font-medium rounded-tr-lg">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {financeRecords.map(record => (
                                    <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">{new Date(record.date).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${record.type === 'Income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {record.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-600">{record.category}</td>
                                        <td className="p-4 font-bold text-ministry-text">UGX {record.amount.toLocaleString()}</td>
                                        <td className="p-4 text-gray-500 max-w-xs truncate">{record.description}</td>
                                        <td className="p-4 text-gray-500">{record.recordedBy}</td>
                                        <td className="p-4">
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    onClick={(e) => handleEditFinance(record, e)}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                                    title="Edit Record"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteFinance(record.id, e)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isAddingFinance && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h3 className="text-xl font-bold text-ministry-text">{newFinance.id ? 'Edit Finance Record' : 'New Finance Record'}</h3>
                            <button onClick={() => setIsAddingFinance(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitFinance} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">{newFinance.type === 'Income' ? 'Date of giving' : 'Date of expenditure'}</label>
                                    <input type="date" required value={newFinance.date || ''} onChange={e => setNewFinance({ ...newFinance, date: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">Type</label>
                                    <select required value={newFinance.type || 'Income'} onChange={e => setNewFinance({ ...newFinance, type: e.target.value as any })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                                        <option value="Income">Giving</option>
                                        <option value="Expense">Expenditure</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">Amount (UGX)</label>
                                    <input
                                        type="text"
                                        required
                                        value={newFinance.amount ? newFinance.amount.toLocaleString() : ''}
                                        onChange={e => {
                                            const val = e.target.value.replace(/,/g, '');
                                            if (val === '') {
                                                setNewFinance({ ...newFinance, amount: 0 }); // Temporarily set 0 to allow the empty string evaluation to succeed
                                            } else if (!isNaN(Number(val))) {
                                                setNewFinance({ ...newFinance, amount: parseFloat(val) });
                                            }
                                        }}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">Payment Method</label>
                                    <select required value={newFinance.method || 'Cash'} onChange={e => setNewFinance({ ...newFinance, method: e.target.value as any })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                                        <option value="Cash">Cash</option>
                                        <option value="Mobile Money">Mobile Money</option>
                                        <option value="Bank">Bank</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">{newFinance.type === 'Income' ? 'Particulars of giving' : 'Particulars of expenditure'}</label>
                                <textarea required value={newFinance.category || ''} onChange={e => setNewFinance({ ...newFinance, category: e.target.value, description: e.target.value })} placeholder="Details here..." className="w-full p-2.5 border border-gray-300 rounded-lg text-sm h-20 resize-none" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-50">
                                <button type="button" onClick={() => setIsAddingFinance(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-ministry-text text-white font-bold rounded-lg hover:bg-ministry-orange transition-colors flex items-center gap-2">
                                    <Save size={16} /> Save Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
} 
