import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Users, HeartHandshake, GraduationCap, Building2 } from 'lucide-react';
import { useCampus } from './CampusContext';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center space-x-4">
        <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-50">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

const TABS = [
    { id: 'families', label: 'Families', icon: Users },
    { id: 'evangelism', label: 'Evangelism', icon: HeartHandshake },
    { id: 'vacists', label: 'Vacists Fellowship', icon: GraduationCap },
    { id: 'alumni', label: 'Alumni Fellowship', icon: Building2 }
];

export const CampusTabsLayout: React.FC = () => {
    const { stats, events, selectedEventId, setSelectedEventId } = useCampus();
    const navigate = useNavigate();
    const location = useLocation();

    const pathParts = location.pathname.split('/');
    const activeTab = pathParts[pathParts.length - 1];
    const basePath = location.pathname.replace(/\/[^/]+$/, '');

    const switchTab = (tab: string) => {
        navigate(`${basePath}/${tab}`);
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-ministry-text">Campus & Institutions</h1>
                    <p className="text-ministry-muted mt-2">Manage campus fellowships, evangelism, and related activities</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ministry-orange transition-all shadow-sm"
                        >
                            <option value="">All Events</option>
                            {events && events.map(event => (
                                <option key={event.id} value={event.id}>{event.title} ({event.date})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Total Souls Won" value={stats.totalSouls.toString()} icon={<Users className="w-6 h-6 text-blue-500" />} />
                <StatCard title="Total Families Setup" value={stats.totalFamilies.toString()} icon={<Building2 className="w-6 h-6 text-green-500" />} />
                <StatCard title="Evangelism Outreaches" value={stats.totalEvangelisms.toString()} icon={<HeartHandshake className="w-6 h-6 text-purple-500" />} />
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 overflow-x-auto whitespace-nowrap hide-scrollbar flex">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => switchTab(tab.id)}
                            className={`flex-1 flex justify-center items-center space-x-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'border-ministry-orange text-ministry-orange bg-ministry-orange/5'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
                <Outlet />
            </div>
        </div>
    );
};
