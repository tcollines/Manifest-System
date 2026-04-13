import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, FileText, Calendar } from 'lucide-react';

const TABS = [
    { id: 'reports', label: 'Outreach Reports', icon: FileText },
    { id: 'events', label: 'Events & Students', icon: Calendar }
];

export const SchoolsTabsLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Extract the active tab based on the current path, default to 'reports'
    const pathParts = location.pathname.split('/');
    const activeTab = pathParts[pathParts.length - 1];
    const basePath = location.pathname.replace(/\/[^/]+$/, '');

    const switchTab = (tab: string) => {
        navigate(`${basePath}/${tab}`);
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-ministry-text flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-ministry-orange" />
                        Schools Department
                    </h1>
                    <p className="text-gray-500">Manage outreach reports and student event attendance.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => switchTab(tab.id)}
                            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all 
                            ${isActive ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-ministry-neon' : ''}`} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content rendering specific nested routes */}
            <div className="bg-ministry-card border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px]">
                <Outlet />
            </div>
        </div>
    );
};
