import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, TrendingUp, MapPin, ClipboardList } from 'lucide-react';

const TABS = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'residences', label: 'Residences', icon: MapPin },
    { id: 'reports', label: 'Outreach Reports', icon: ClipboardList }
];

export const ResidentTabsLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Extract the active tab based on the current path, default to 'overview'
    const pathParts = location.pathname.split('/');
    const activeTab = pathParts[pathParts.length - 1];
    const basePath = location.pathname.replace(/\/[^/]+$/, '');

    const switchTab = (tab: string) => {
        navigate(`${basePath}/${tab}`);
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-ministry-text flex items-center gap-3">
                        <Home className="w-8 h-8 text-ministry-orange" />
                        Residents Dashboard
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 mt-1">
                        Manage resident areas, outreach, and souls won.
                    </p>
                </div>
            </div>

            {/* Navigation Tabs (Pills style, mirroring legacy ResidentDashboard) */}
            <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit overflow-x-auto mb-8">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => switchTab(tab.id)}
                            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap 
                            ${isActive ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-ministry-neon' : ''}`} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content rendering specific nested routes */}
            <Outlet />
        </div>
    );
};
