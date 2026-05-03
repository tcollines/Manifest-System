import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotification } from './ui/NotificationSystem';
import { Download, Filter, FileText, DollarSign, Heart, ChevronDown, ClipboardList } from 'lucide-react';
import { SERVICE_REPORT_DATA, FINANCIAL_REPORT_DATA, SOULS_CHANNELS_DATA } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { User } from '../types';
import ReportsDashboard from '../pages/ReportsDashboard';

type ReportType = 'service' | 'financial' | 'souls' | 'department';
type FilterType = 'Monthly' | 'Quarterly' | 'Annually';

interface ReportsViewProps {
  currentUser: User | null;
  isGlobal?: boolean;
}

const ReportsView: React.FC<ReportsViewProps> = ({ currentUser, isGlobal = false }) => {
  const { showToast } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const VALID_REPORT_TYPES: ReportType[] = ['service', 'financial', 'souls', 'department'];
  const rawReport = searchParams.get('report') as ReportType;
  const activeReport: ReportType = VALID_REPORT_TYPES.includes(rawReport) ? rawReport : 'department';
  const setActiveReport = (report: ReportType) => {
    setSearchParams(prev => { prev.set('report', report); return prev; }, { replace: true });
  };
  const [filter, setFilter] = useState<FilterType>('Monthly');

  const handleDownload = () => {
    showToast(`Downloading ${filter} ${activeReport} report as PDF...`, 'info');
  };

  // --- Dynamic Data Logic ---

  // 1. Service Data Logic
  const serviceRows = useMemo(() => {
    if (filter === 'Monthly') {
      return SERVICE_REPORT_DATA;
    } else if (filter === 'Quarterly') {
      return [
        { id: 101, date: 'October', service: 'Monthly Aggregate', adults: 3850, nextGen: 850, souls: 120 },
        { id: 102, date: 'November', service: 'Monthly Aggregate', adults: 4100, nextGen: 920, souls: 145 },
        { id: 103, date: 'December', service: 'Monthly Aggregate', adults: 5200, nextGen: 1100, souls: 210 },
      ];
    } else {
      // Annually
      return [
        { id: 201, date: 'Q1', service: 'Quarterly Aggregate', adults: 11500, nextGen: 2800, souls: 350 },
        { id: 202, date: 'Q2', service: 'Quarterly Aggregate', adults: 12800, nextGen: 3100, souls: 420 },
        { id: 203, date: 'Q3', service: 'Quarterly Aggregate', adults: 13200, nextGen: 3400, souls: 480 },
        { id: 204, date: 'Q4', service: 'Quarterly Aggregate', adults: 15500, nextGen: 3900, souls: 650 },
      ];
    }
  }, [filter]);

  // 2. Financial & Souls Multiplier Logic
  const multiplier = useMemo(() => {
    switch (filter) {
      case 'Quarterly': return 3;
      case 'Annually': return 12;
      default: return 1;
    }
  }, [filter]);

  const financialData = useMemo(() => ({
    income: FINANCIAL_REPORT_DATA.income.map(item => ({
      ...item,
      amount: item.amount * multiplier
    })),
    expenses: FINANCIAL_REPORT_DATA.expenses.map(item => ({
      ...item,
      amount: item.amount * multiplier
    }))
  }), [multiplier]);

  const soulsData = useMemo(() => SOULS_CHANNELS_DATA.map(item => ({
    ...item,
    count: item.count * multiplier
  })), [multiplier]);

  const totalIncome = financialData.income.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = financialData.expenses.reduce((acc, curr) => acc + curr.amount, 0);

  // --- End Logic ---

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ministry-text mb-1">Reports Center</h1>
          <p className="text-gray-500">Generate detailed analytics and Manage Department Reports.</p>
        </div>

        {activeReport !== 'department' && (
          <div className="flex space-x-3">
            <div className="relative group">
              <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm">
                <Filter className="w-4 h-4 text-gray-500" />
                <span>{filter}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              <div className="absolute top-full right-0 mt-2 w-36 bg-white border border-gray-200 rounded-xl shadow-lg hidden group-hover:block z-20">
                {['Monthly', 'Quarterly', 'Annually'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as FilterType)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 bg-ministry-orange text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 transition-colors font-bold shadow-lg shadow-orange-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit">
        {[
          { id: 'department', label: 'Monthly Department Reports', icon: ClipboardList },
          { id: 'service', label: 'Service Analytics', icon: FileText, adminOnly: true },
          { id: 'financial', label: 'Financial Analytics', icon: DollarSign, adminOnly: true },
          { id: 'souls', label: 'Souls Analytics', icon: Heart, adminOnly: true },
        ].filter(tab => !tab.adminOnly || (isGlobal && ['Administrator', 'TeamLeader'].includes(currentUser?.role || '')))
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id as ReportType)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${isActive
                  ? 'bg-white text-ministry-text shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-ministry-orange' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
      </div>

      {activeReport === 'department' ? (
        <div className="bg-ministry-card border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px]">
          {currentUser ? (
            <ReportsDashboard user={currentUser} isGlobal={isGlobal} />
          ) : (
            <div>Please log in to view reports.</div>
          )}
        </div>
      ) : (
        /* Report Content (Analytics) */
        <div className="bg-ministry-card border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px]">

          {/* === SERVICE REPORT === */}
          {activeReport === 'service' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-800">Attendance & Souls Breakdown</h3>
                <span className="text-sm text-gray-500">Period: <span className="font-semibold text-gray-900">{filter}</span></span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-medium">{filter === 'Monthly' ? 'Date' : 'Period'}</th>
                      <th className="px-6 py-4 font-medium">Service Name</th>
                      <th className="px-6 py-4 font-medium">Adults / Reg.</th>
                      <th className="px-6 py-4 font-medium">Next Gen</th>
                      <th className="px-6 py-4 font-medium">Total Attendance</th>
                      <th className="px-6 py-4 font-medium">Souls Won</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {serviceRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-600 font-medium">{row.date}</td>
                        <td className="px-6 py-4 text-gray-900 font-semibold">{row.service}</td>
                        <td className="px-6 py-4 text-gray-600">{row.adults.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-600">{row.nextGen.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-900 font-bold">{(row.adults + row.nextGen).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            {row.souls.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                      <td className="px-6 py-4">TOTAL</td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4">{serviceRows.reduce((a, b) => a + b.adults, 0).toLocaleString()}</td>
                      <td className="px-6 py-4">{serviceRows.reduce((a, b) => a + b.nextGen, 0).toLocaleString()}</td>
                      <td className="px-6 py-4">{serviceRows.reduce((a, b) => a + b.adults + b.nextGen, 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-green-700">{serviceRows.reduce((a, b) => a + b.souls, 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* === FINANCIAL REPORT === */}
          {activeReport === 'financial' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                  <p className="text-green-600 font-medium mb-1">Total Income</p>
                  <h2 className="text-3xl font-bold text-green-800">${totalIncome.toLocaleString()}</h2>
                  <p className="text-sm text-green-600/80 mt-2">+12% vs previous period</p>
                </div>
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                  <p className="text-red-600 font-medium mb-1">Total Expenditure</p>
                  <h2 className="text-3xl font-bold text-red-800">${totalExpense.toLocaleString()}</h2>
                  <p className="text-sm text-red-600/80 mt-2">-5% vs previous period</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Income Table */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <span className="w-2 h-6 bg-green-500 rounded-full mr-2"></span>
                    Income Breakdown
                  </h4>
                  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-100">
                        {financialData.income.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-700">{item.category}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.percentage}%</td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">${item.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expense Table */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <span className="w-2 h-6 bg-red-500 rounded-full mr-2"></span>
                    Expenditure Breakdown
                  </h4>
                  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-100">
                        {financialData.expenses.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-700">{item.category}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.percentage}%</td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">${item.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === SOULS REPORT === */}
          {activeReport === 'souls' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {soulsData.map((channel, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-ministry-orange/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className={`w-3 h-3 rounded-full ${channel.color}`}></div>
                      <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{channel.trend}</span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium mb-1">{channel.channel}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{channel.count.toLocaleString()}</h3>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-6">Channel Performance Analysis ({filter})</h4>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={soulsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="channel" type="category" width={120} tick={{ fontSize: 12, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                        {soulsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color.replace('bg-', '').replace('-500', '') === 'orange' ? '#f97316' : entry.color.replace('bg-', '').replace('-500', '') === 'blue' ? '#3b82f6' : entry.color.replace('bg-', '').replace('-500', '') === 'purple' ? '#a855f7' : '#22c55e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default ReportsView;
