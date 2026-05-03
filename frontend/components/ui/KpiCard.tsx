import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  isLoading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, trend, className = '', isLoading = false }) => {
  return (
    <div className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 ${className}`}>
      {/* Decorative gradient blob */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full blur-2xl opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
      
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <div className="flex items-end space-x-2">
              <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
              {trend && (
                <span className={`text-xs font-medium mb-1 px-1.5 py-0.5 rounded-full ${
                  trend.isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {trend.isPositive ? '↑' : '↓'} {trend.value}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl bg-gray-50 text-gray-500 group-hover:bg-ministry-orange/10 group-hover:text-ministry-orange transition-colors">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
