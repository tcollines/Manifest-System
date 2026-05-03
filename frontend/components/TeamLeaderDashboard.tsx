import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, Users, ClipboardList, CheckCircle, AlertTriangle, Building, ArrowUpRight } from 'lucide-react';
import { ManifestStore } from '../database/manifestStore';
import { ManifestDetails } from '../types';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService';
import { KpiCard } from './ui/KpiCard';

const TeamLeaderDashboard: React.FC = () => {
  const [manifest, setManifest] = useState<ManifestDetails | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchManifest = async () => {
      const data = await ManifestStore.get();
      setManifest(data);
    };
    fetchManifest();
  }, []);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', 'team-leader'],
    queryFn: () => analyticsService.fetchTeamLeaderAnalytics()
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'UGX' }).format(amount);
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ministry-orange rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-ministry-text">Team Leader Dashboard</h1>
          </div>
          <p className="text-gray-500 mt-1">
            Ministry oversight and approval center.
            {manifest && <span className="font-bold text-ministry-text ml-2">Manifest: {manifest.name}</span>}
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center space-x-2 bg-ministry-text text-white px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors font-bold shadow-lg"
          >
            <Settings className="w-4 h-4" />
            <span>Manifest Settings</span>
          </button>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* Section 1: Totals */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Financial Overview (Current Month)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard 
              label="Total Requested Amount"
              value={formatCurrency(analytics?.requested_amount || 0)}
              icon={ClipboardList}
              isLoading={isLoading}
            />
            <KpiCard 
              label="Total Approved Amount"
              value={formatCurrency(analytics?.approved_amount || 0)}
              icon={CheckCircle}
              isLoading={isLoading}
            />
            <KpiCard 
              label="Total Adjustments Made"
              value={formatCurrency(analytics?.adjustments_made || 0)}
              icon={AlertTriangle}
              isLoading={isLoading}
            />
          </div>
        </section>

        {/* Section 2: Workload */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Action Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <KpiCard 
              label="Workplans Pending TL Review"
              value={analytics?.pending_approvals || 0}
              icon={ClipboardList}
              isLoading={isLoading}
              className="border-l-4 border-l-yellow-400"
            />
            <div className="bg-gradient-to-r from-ministry-text to-gray-800 rounded-2xl p-6 shadow-md flex items-center justify-between text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/dashboard?tab=workplans')}>
              <div>
                <h3 className="text-lg font-bold">Review Queue</h3>
                <p className="text-gray-300 text-sm mt-1">Jump directly to pending workplans and requisitions.</p>
              </div>
              <ArrowUpRight className="w-8 h-8 opacity-50" />
            </div>
          </div>
        </section>

        {/* Section 3: Breakdown */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Departmental Breakdown</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-ministry-orange" />
                <h3 className="text-lg font-bold text-ministry-text">Approved vs Requested (Excl. Finance)</h3>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">Department</th>
                    <th className="p-4 text-right">Requested</th>
                    <th className="p-4 text-right">Approved</th>
                    <th className="p-4 pr-6 text-right">Adjustment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">Loading breakdown...</td></tr>
                  ) : analytics?.department_breakdown?.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">No departmental data for this period.</td></tr>
                  ) : (
                    analytics?.department_breakdown?.map((dept: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 pl-6 font-medium text-gray-900">{dept.department_name}</td>
                        <td className="p-4 text-right text-gray-600">{formatCurrency(dept.requested)}</td>
                        <td className="p-4 text-right font-medium text-green-600">{formatCurrency(dept.approved)}</td>
                        <td className="p-4 pr-6 text-right text-red-500">
                          {formatCurrency(dept.requested - dept.approved)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default TeamLeaderDashboard;
