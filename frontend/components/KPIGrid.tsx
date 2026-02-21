import React, { useEffect, useState } from 'react';
import { ModalType, MinistryEvent } from '../types';
import { Plus, UserPlus, Target, FileText, Download, Sparkles, Map, Maximize2, Package } from 'lucide-react';
import { useEventLifecycle } from '../hooks/useEventLifecycle';
import { EventStore } from '../database/eventStore';
import { KPI } from '../types';
import { FinanceStore } from '../database/financeStore';
import { ManifestStore } from '../database/manifestStore';
import * as Icons from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface KPIGridProps {
  eventId?: string;
}

console.log('ManifestStore Imported in KPIGrid:', ManifestStore);

const KPIGrid: React.FC<KPIGridProps> = ({ eventId }) => {
  const [kpis, setKpis] = useState<KPI[]>([
    { id: '1', label: 'Total Collections', value: '...', change: '0%', trend: 'neutral', icon: 'DollarSign' },
    { id: '2', label: 'Monthly Expenses', value: '...', change: '0%', trend: 'neutral', icon: 'Activity' },
    { id: '3', label: 'Total Offerings', value: '...', change: '0%', trend: 'neutral', icon: 'Heart' },
    { id: '4', label: 'Partnerships', value: '...', change: '0%', trend: 'neutral', icon: 'Briefcase' },
    { id: '5', label: 'PMI Giving', value: '...', change: '0%', trend: 'neutral', icon: 'TrendingUp' },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      // Skip if eventId is required but not provided
      if (!eventId) {
        setKpis(prev => prev.map(k => ({ ...k, value: '...' })));
        return;
      }

      // Prevent fetching if session is ending/cleared
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      // 1. Get Currency
      const manifest = await ManifestStore.get();
      const currency = manifest.currency || 'UGX';

      // 2. Get Aggregated Summary (O(1) payload)
      const summary = await FinanceStore.getEventSummary(eventId);

      // We still need raw transactions for partnerships and PMI giving since they aren't in the generic Postgres summary yet
      let transactions = await FinanceStore.getTransactions(eventId);

      // 3. Calculate Extra Totals (Consider moving these to RPC later)
      const totalOfferings = transactions.filter(t => t.type === 'Income' && (t.category === 'Offerings' || t.category === 'Tithes')).reduce((sum, t) => sum + t.amount, 0);
      const partnershipCount = transactions.filter(t => t.type === 'Income' && t.category === 'Partnership').length;
      const pmiGiving = transactions.filter(t => t.type === 'Income' && t.category === 'PMI Giving').reduce((sum, t) => sum + t.amount, 0);

      const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
      };

      setKpis([
        { id: '1', label: 'Total Collections', value: formatMoney(summary.total_income), change: '+12%', trend: 'up', icon: 'DollarSign' },
        { id: '2', label: 'Monthly Expenses', value: formatMoney(summary.total_expense), change: '-5%', trend: 'down', icon: 'Activity' },
        { id: '3', label: 'Total Offerings', value: formatMoney(totalOfferings), change: '+8%', trend: 'up', icon: 'Heart' },
        { id: '4', label: 'Partnerships (Count)', value: partnershipCount.toString(), change: '+24', trend: 'up', icon: 'Briefcase' },
        { id: '5', label: 'PMI Giving', value: formatMoney(pmiGiving), change: '+15%', trend: 'up', icon: 'TrendingUp' },
      ]);
    };

    fetchData();
  }, [eventId]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-8">
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
              <p className="text-gray-500 text-sm mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-ministry-text tracking-wide truncate">{kpi.value}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KPIGrid;
