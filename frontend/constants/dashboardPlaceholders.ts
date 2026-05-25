import { KPI } from '../types';

// NOTE: KPI structure is used for visual layout, values will be populated dynamically.
export const KPIS: KPI[] = [
  { id: '1', label: 'Total Collections', value: '...', change: '0%', trend: 'up', icon: 'DollarSign' },
  { id: '2', label: 'Monthly Expenses', value: '...', change: '0%', trend: 'down', icon: 'Activity' },
  { id: '3', label: 'Total Offerings', value: '...', change: '0%', trend: 'up', icon: 'Heart' },
  { id: '4', label: 'Partnerships', value: '...', change: '0%', trend: 'up', icon: 'Briefcase' },
  { id: '5', label: 'PMI Giving', value: '...', change: '0%', trend: 'up', icon: 'TrendingUp' },
];

export const SERVICE_REPORT_DATA = [
  { id: 1, date: 'Oct 01', service: 'Sunday Glory Service', adults: 1250, nextGen: 300, souls: 45 },
  { id: 2, date: 'Oct 05', service: 'Power Thursday', adults: 850, nextGen: 150, souls: 20 },
];

export const FINANCIAL_REPORT_DATA = {
  income: [
    { category: 'Tithes & Offerings', percentage: 65, amount: 80925 },
    { category: 'Partnership Giving', percentage: 25, amount: 31125 },
  ],
  expenses: [
    { category: 'Operations & Maintenance', percentage: 40, amount: 18080 },
    { category: 'Outreach & Missions', percentage: 30, amount: 13560 },
  ]
};

export const SOULS_CHANNELS_DATA = [
  { channel: 'Street Evangelism', count: 450, color: 'bg-orange-500', trend: '+12%' },
  { channel: 'Online Outreach', count: 300, color: 'bg-blue-500', trend: '+8%' },
  { channel: 'Church Services', count: 550, color: 'bg-purple-500', trend: '+15%' },
  { channel: 'Special Events', count: 200, color: 'bg-green-500', trend: '+5%' },
];
