import React, { useState, useEffect } from 'react';
import { X, Baby, CheckCircle } from 'lucide-react';

interface ManualCountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (count: number) => void;
    initialCount?: number;
}

const ManualCountModal: React.FC<ManualCountModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialCount = 0
}) => {
    const [count, setCount] = useState<string>(initialCount.toString());

    // Sync state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCount(initialCount.toString());
        }
    }, [isOpen, initialCount]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseInt(count);
        if (!isNaN(num) && num >= 0) {
            onConfirm(num);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-ministry-card p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Baby className="w-5 h-5 text-ministry-orange" />
                        Children Count
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">
                        Enter the total number of children present manually. This will update the service statistics.
                    </p>

                    <style>{`
                        /* Chrome, Safari, Edge, Opera */
                        input::-webkit-outer-spin-button,
                        input::-webkit-inner-spin-button {
                            -webkit-appearance: none;
                            margin: 0;
                        }
                        /* Firefox */
                        input[type=number] {
                            -moz-appearance: textfield;
                        }
                    `}</style>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-gray-400">Total Count</label>
                        <div className="relative">
                            <input
                                autoFocus
                                type="number"
                                min="0"
                                value={count}
                                onChange={(e) => setCount(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                        e.preventDefault();
                                    }
                                }}
                                className="w-full text-3xl font-black text-center p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange focus:ring-4 focus:ring-orange-50/50 transition-all text-ministry-text"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 px-4 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Update
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManualCountModal;
