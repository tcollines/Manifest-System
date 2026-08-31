import React from 'react';

interface StatItem {
    label: string;
    value: number;
    color: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
}

interface StatsGridProps {
    items: StatItem[];
}

const colorMap: Record<string, { border: string; text: string; bg: string }> = {
    blue: { border: 'border-t-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
    emerald: { border: 'border-t-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    amber: { border: 'border-t-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
    rose: { border: 'border-t-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' },
    violet: { border: 'border-t-violet-500', text: 'text-violet-600', bg: 'bg-violet-50' },
};

const StatsGrid: React.FC<StatsGridProps> = ({ items }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {items.map((item) => {
                const colors = colorMap[item.color] || colorMap.blue;
                return (
                    <div key={item.label} className={`bg-white rounded-xl border border-gray-200 border-t-[3px] ${colors.border} p-6 hover:shadow-md transition-all`}>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{item.label}</div>
                        <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{item.value.toLocaleString()}</div>
                    </div>
                );
            })}
        </div>
    );
};

export default StatsGrid;
