import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { Plus, Trash2, Save, X, DollarSign } from 'lucide-react';
import { Requisition, RequisitionItem } from '../types';
import { RequisitionStore } from '../database/requisitionStore';

interface RequisitionFormProps {
    onClose: () => void;
    onSuccess: () => void;
    currentUser: any; // User type
    initialData?: Requisition;
}

interface FormItem {
    id: string; // temp id
    description: string;
    quantity: number;
    unitCost: number;
}

const RequisitionForm: React.FC<RequisitionFormProps> = ({ onClose, onSuccess, currentUser, initialData }) => {
    const { showToast } = useNotification();
    // Initialize state properly whether strictly new or editing
    const [title, setTitle] = useState(initialData?.title || '');
    // If editing, map existing items. If new, default one empty item.
    const [items, setItems] = useState<FormItem[]>(() => {
        if (initialData?.items && initialData.items.length > 0) {
            return initialData.items.map(item => ({
                id: item.id, // maintain ID mainly for React key, but we treat them as fresh for logic
                description: item.description,
                quantity: item.quantity,
                unitCost: item.unitCost
            }));
        }
        return [{ id: '1', description: '', quantity: 1, unitCost: 0 }];
    });
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-calculate total
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitCost: 0 }]);
    };

    const handleRemoveItem = (id: string) => {
        if (items.length === 1) return;
        setItems(items.filter(i => i.id !== id));
    };

    const handleItemChange = (id: string, field: keyof FormItem, value: any) => {
        setItems(items.map(i => {
            if (i.id === id) {
                return { ...i, [field]: value };
            }
            return i;
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            showToast("Please enter a title for this requisition.", 'error');
            return;
        }
        if (items.some(i => !i.description.trim())) {
            showToast("Please ensure all items have a description.", 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const reqItems = items.map(i => ({
                description: i.description,
                quantity: i.quantity,
                unitCost: i.unitCost,
                totalCost: i.quantity * i.unitCost
            }));

            if (initialData) {
                // EDIT MODE
                const updatedReq: any = {
                    title,
                    totalAmount,
                    notes
                };
                await RequisitionStore.update(initialData.id, updatedReq, reqItems);
                showToast("Requisition updated and resubmitted successfully!", 'success');
            } else {
                // CREATE MODE
                const newReq: any = {
                    title,
                    departmentId: currentUser?.departmentId || 'General',
                    requesterId: currentUser?.id,
                    status: 'Pending',
                    totalAmount,
                    notes
                };
                await RequisitionStore.create(newReq, reqItems);
                showToast("Requisition submitted successfully!", 'success');
            }

            onSuccess();
        } catch (error: any) {
            console.error("Failed to submit requisition:", error);
            showToast(`Error submitting requisition: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] md:h-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-ministry-text">{initialData ? 'Edit Requisition' : 'New Requisition'}</h2>
                    <p className="text-gray-500 text-sm">{initialData ? 'Update and resubmit your request.' : 'Create a new funding request for your department.'}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-y-auto pr-2">
                {/* Header Details */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Requisition Title</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., Sunday Service Refreshments"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ministry-orange focus:border-transparent"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                </div>

                {/* Items Table */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700">Items</h3>
                        <span className="text-xs text-gray-500">Auto-calculated totals</span>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-3 items-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="col-span-5 md:col-span-6">
                                    <label className="block text-xs text-gray-400 mb-1">{index === 0 ? 'Description' : ''}</label>
                                    <input
                                        type="text"
                                        placeholder="Item description"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                        value={item.description}
                                        onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs text-gray-400 mb-1">{index === 0 ? 'Qty' : ''}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm text-center"
                                        value={item.quantity}
                                        onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-xs text-gray-400 mb-1">{index === 0 ? 'Unit Cost' : ''}</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">UGX</span>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full border border-gray-300 rounded-md pl-8 pr-2 py-2 text-sm text-right"
                                            value={item.unitCost}
                                            onChange={e => handleItemChange(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2 md:col-span-1 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="mt-4 flex items-center space-x-2 text-sm text-ministry-orange font-bold hover:text-orange-700"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Item</span>
                    </button>
                </div>

                {/* Footer Totals & Notes */}
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 h-24 resize-none text-sm"
                            placeholder="Any context for the approver..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="w-full md:w-64 bg-gray-900 text-white p-6 rounded-xl flex flex-col justify-between">
                        <div>
                            <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Total Amount</p>
                            <div className="flex items-start text-green-400">
                                <span className="text-lg mt-1 mr-1">UGX</span>
                                <span className="text-3xl font-black">{totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full mt-6 bg-ministry-orange text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {isSubmitting ? (
                                <span>Submitting...</span>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Submit Request</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default RequisitionForm;
