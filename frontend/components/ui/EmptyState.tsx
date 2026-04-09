import React from 'react';
import { FileX, Search, Users, Calendar, DollarSign, LucideIcon } from 'lucide-react';

type EmptyStateVariant = 'default' | 'search' | 'members' | 'schedule' | 'finance';

interface EmptyStateProps {
    title?: string;
    message?: string;
    variant?: EmptyStateVariant;
    /** Optional CTA button text */
    actionLabel?: string;
    onAction?: () => void;
    icon?: LucideIcon;
    className?: string;
}

const VARIANT_ICONS: Record<EmptyStateVariant, LucideIcon> = {
    default:  FileX,
    search:   Search,
    members:  Users,
    schedule: Calendar,
    finance:  DollarSign,
};

const VARIANT_MESSAGES: Record<EmptyStateVariant, { title: string; message: string }> = {
    default:  { title: 'No data yet',     message: 'Nothing to display here.' },
    search:   { title: 'No results',      message: 'Try adjusting your search or filters.' },
    members:  { title: 'No members yet',  message: 'Add members to get started.' },
    schedule: { title: 'No schedules',    message: 'Create a service schedule for this department.' },
    finance:  { title: 'No entries yet',  message: 'Record income or expenses to see them here.' },
};

/**
 * EmptyState — standardised "nothing here" placeholder.
 * Use in place of scattered inline "No X found" divs.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    message,
    variant = 'default',
    actionLabel,
    onAction,
    icon: CustomIcon,
    className = '',
}) => {
    const defaults = VARIANT_MESSAGES[variant];
    const Icon = CustomIcon ?? VARIANT_ICONS[variant];

    return (
        <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
            <div className="bg-gray-100 rounded-full p-5 mb-4">
                <Icon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">
                {title ?? defaults.title}
            </h3>
            <p className="text-sm text-gray-400 max-w-xs">
                {message ?? defaults.message}
            </p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="mt-5 inline-flex items-center gap-2 bg-ministry-text text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-ministry-orange transition-colors"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
