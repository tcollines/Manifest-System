import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

// --- Types ---
type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: NotificationType;
}

interface ConfirmOptions {
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

interface NotificationContextType {
    showToast: (message: string, type?: NotificationType) => void;
    confirm: (message: React.ReactNode, options?: Partial<ConfirmOptions>) => Promise<boolean>;
}

// --- Context ---
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

// --- Components ---

// 1. Toast Component
const ToastItem: React.FC<{ toast: Toast; onClose: (id: string) => void }> = ({ toast, onClose }) => {
    // Auto-dismiss
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(toast.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error': return <AlertOctagon className="w-5 h-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBorderColor = () => {
        switch (toast.type) {
            case 'success': return 'border-green-500';
            case 'error': return 'border-red-500';
            case 'warning': return 'border-yellow-500';
            default: return 'border-blue-500';
        }
    };

    return (
        <div className={`flex items-start p-4 mb-3 bg-white rounded-xl shadow-lg border-l-4 ${getBorderColor()} min-w-[300px] max-w-md animate-in slide-in-from-right-full duration-300 pointer-events-auto`}>
            <div className="flex-shrink-0 mr-3 mt-0.5">
                {getIcon()}
            </div>
            <div className="flex-1 mr-2">
                <p className="text-sm font-medium text-gray-800 leading-snug">{toast.message}</p>
            </div>
            <button onClick={() => onClose(toast.id)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// 2. Confirm Modal Component
interface ConfirmDialogProps {
    isOpen: boolean;
    options: ConfirmOptions;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, options, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200 scale-100 p-6 border border-gray-100">
                <div className="flex items-start mb-4">
                    <div className={`p-3 rounded-full mr-4 bg-gray-100`}>
                        <AlertTriangle className="w-6 h-6 text-ministry-orange" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{options.title}</h3>
                        <p className="text-gray-600 leading-relaxed text-sm">
                            {options.message}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                    >
                        {options.cancelText || 'Cancel'}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 text-sm ${options.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-ministry-text hover:bg-ministry-orange'
                            }`}
                    >
                        {options.confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Provider ---
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Confirm State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions>({ title: '', message: '' });
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    // Toast Logic
    const showToast = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Confirm Logic
    const confirm = useCallback((message: React.ReactNode, options?: Partial<ConfirmOptions>): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmOptions({
                title: options?.title || 'Confirmation',
                message: message,
                confirmText: options?.confirmText || 'Yes, Proceed',
                cancelText: options?.cancelText || 'Cancel',
                isDestructive: options?.isDestructive ?? false
            });
            setConfirmOpen(true);
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = () => {
        setConfirmOpen(false);
        if (resolveRef.current) {
            resolveRef.current(true);
            resolveRef.current = null;
        }
    };

    const handleCancel = () => {
        setConfirmOpen(false);
        if (resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
        }
    };

    return (
        <NotificationContext.Provider value={{ showToast, confirm }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
                ))}
            </div>

            {/* Confirm Modal */}
            <ConfirmDialog
                isOpen={confirmOpen}
                options={confirmOptions}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </NotificationContext.Provider>
    );
};
