import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface MobileSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const MobileSheet: React.FC<MobileSheetProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer
}) => {
    // Lock body scroll when sheet is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Click away overlay */}
            <div className="absolute inset-0" onClick={onClose} />
            
            {/* Sheet Container */}
            <div className="relative bg-white w-full rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
                    {children}
                </div>

                {/* Footer Slot */}
                {footer && (
                    <div className="flex-shrink-0 border-t border-gray-100 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
