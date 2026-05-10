import React, { useEffect, useState } from 'react';
import { KPI } from '../types';
import * as Icons from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ManifestStore } from '../database/manifestStore';
import { analyticsService } from '../services/analyticsService';

import { useQuery } from '@tanstack/react-query';

interface KPIGridProps {
  eventId?: string;
  initialData?: any;
}

const KPIGrid: React.FC<KPIGridProps> = ({ eventId, initialData }) => {
  const { data: stats } = useQuery({
      queryKey: ['dashboard_kpis'],
      queryFn: () => analyticsService.fetchDashboardKPIs(),
      initialData: initialData,
      staleTime: 5 * 60 * 1000,
  });

  const { data: soulsTarget } = useQuery({
      queryKey: ['manifest_target'],
      queryFn: async () => {
          const manifest = await ManifestStore.get();
          return manifest.soulsTarget || 1000;
      },
      initialData: 1000,
      staleTime: Infinity,
  });

  const percentageSouls = stats && soulsTarget && stats.totalSoulsWon > 0 
    ? Math.min(100, Number(((stats.totalSoulsWon / soulsTarget) * 100).toFixed(1))) 
    : 0;

  const kpis: KPI[] = [
    { id: '1', label: 'Active Members (>0% Attendance)', value: stats ? stats.activeMembers.toLocaleString() : '...', change: stats ? 'Metrics Live' : '--', trend: 'neutral', icon: 'Users' },
    { id: '2', label: 'Souls Won Percentage', value: stats ? `${percentageSouls}%` : '...', change: stats ? `${stats.totalSoulsWon} Souls` : '--', trend: 'neutral', icon: 'Target' },
    { id: '3', label: 'Next Gen Active Members', value: stats ? stats.nextGenActive.toLocaleString() : '...', change: stats ? 'Metrics Live' : '--', trend: 'neutral', icon: 'Baby' },
    { id: '4', label: 'Total First Timers', value: stats ? stats.totalFirstTimers.toLocaleString() : '...', change: stats ? 'Metrics Live' : '--', trend: 'neutral', icon: 'UserPlus' },
    { id: '5', label: 'Registered Residential Areas', value: stats ? stats.registeredResidences.toLocaleString() : '...', change: stats ? 'Metrics Live' : '--', trend: 'neutral', icon: 'MapPin' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
      {kpis.map((kpi) => {
        const IconComponent = (Icons as any)[kpi.icon] || Icons.Activity;
        return (
          <div key={kpi.id} className="bg-ministry-card p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-ministry-neon/20 transition-colors">
                <IconComponent className="w-6 h-6 text-gray-700 group-hover:text-ministry-orange" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${kpi.trend === 'up' ? 'bg-green-100 text-green-700' :
                kpi.trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                {kpi.change}
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-sm mb-1 line-clamp-1" title={kpi.label}>{kpi.label}</p>
              <h3 className="text-2xl font-bold text-ministry-text tracking-wide truncate">{kpi.value}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(KPIGrid);
