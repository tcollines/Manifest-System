import React from 'react';

type BadgeVariant =
    | 'default'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'purple'
    | 'orange';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    /** Optional dot indicator */
    dot?: boolean;
    size?: 'sm' | 'md';
    className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error:   'bg-red-100 text-red-600',
    info:    'bg-blue-100 text-blue-700',
    purple:  'bg-purple-100 text-purple-700',
    orange:  'bg-orange-100 text-orange-700',
};

const DOT_STYLES: Record<BadgeVariant, string> = {
    default: 'bg-gray-400',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error:   'bg-red-500',
    info:    'bg-blue-500',
    purple:  'bg-purple-500',
    orange:  'bg-orange-500',
};

/**
 * Maps common status strings to badge variants automatically.
 */
export const statusVariant = (status: string): BadgeVariant => {
    const s = status.toLowerCase();
    if (['approved', 'paid', 'completed', 'published', 'active', 'excellent'].some(k => s.includes(k))) return 'success';
    if (['pending', 'draft', 'submitted'].some(k => s.includes(k)))  return 'warning';
    if (['rejected', 'overdue', 'error'].some(k => s.includes(k)))   return 'error';
    if (['good'].some(k => s.includes(k)))                            return 'info';
    if (['hod', 'dept admin', 'admin'].some(k => s.includes(k)))      return 'purple';
    if (['finance'].some(k => s.includes(k)))                         return 'orange';
    return 'default';
};

/**
 * Badge — status pill / label chip.
 * Use this instead of ad-hoc <span> status labels.
 *
 * @example
 * <Badge label={workplan.status} variant={statusVariant(workplan.status)} dot />
 */
const Badge: React.FC<BadgeProps> = ({
    label,
    variant = 'default',
    dot = false,
    size = 'sm',
    className = '',
}) => {
    const sizeClass = size === 'md'
        ? 'px-3 py-1 text-sm font-semibold'
        : 'px-2.5 py-0.5 text-xs font-semibold';

    return (
        <span
            className={[
                'inline-flex items-center gap-1.5 rounded-full',
                sizeClass,
                VARIANT_STYLES[variant],
                className,
            ].join(' ')}
        >
            {dot && (
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_STYLES[variant]}`} />
            )}
            {label}
        </span>
    );
};

export default Badge;
