import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    /** Lucide icon component */
    icon?: LucideIcon;
    /** Icon background colour class (default 'bg-ministry-orange/10') */
    iconBg?: string;
    /** Icon colour class (default 'text-ministry-orange') */
    iconColor?: string;
    /** Optional trend: positive = green arrow up, negative = red arrow down */
    trend?: number;
    trendLabel?: string;
    /** If true, applies a subtle loading skeleton instead of value */
    loading?: boolean;
    className?: string;
    onClick?: () => void;
}

/**
 * StatCard — standardised KPI card.
 * Use in Overview tabs and dashboard summaries.
 */
const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    iconBg = 'bg-ministry-orange/10',
    iconColor = 'text-ministry-orange',
    trend,
    trendLabel,
    loading = false,
    className = '',
    onClick,
}) => {
    const TrendIcon = trend == null ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
    const trendColor = trend == null ? '' : trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400';

    return (
        <div
            onClick={onClick}
            className={[
                'bg-white rounded-2xl border border-gray-100 p-5 shadow-sm',
                'flex flex-col gap-3',
                onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '',
                className,
            ].join(' ')}
        >
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
                {Icon && (
                    <div className={`rounded-xl p-2 ${iconBg}`}>
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                )}
            </div>

            {loading ? (
                <div className="h-8 bg-gray-100 rounded-lg animate-pulse w-2/3" />
            ) : (
                <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
            )}

            {(subtitle || trend != null) && !loading && (
                <div className="flex items-center gap-2">
                    {TrendIcon && (
                        <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
                            <TrendIcon className="w-3.5 h-3.5" />
                            {Math.abs(trend!)}%
                        </span>
                    )}
                    {(trendLabel || subtitle) && (
                        <span className="text-xs text-gray-400">{trendLabel ?? subtitle}</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default StatCard;
