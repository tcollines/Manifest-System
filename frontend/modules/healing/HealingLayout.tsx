import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, FileText, Users, HeartHandshake, Plus } from 'lucide-react';
import { HealingProvider } from './HealingContext';
import { HealingModals } from './HealingModals';

const HEALING_TABS = [
  { id: 'overview', label: 'Overview', icon: <Shield className="w-4 h-4" /> },
  { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
  { id: 'souls', label: 'Souls Won', icon: <Users className="w-4 h-4" /> },
  { id: 'testimonies', label: 'Testimonies', icon: <HeartHandshake className="w-4 h-4" /> },
];

const HealingLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Extract the active tab from location
    const pathParts = location.pathname.split('/');
    const activeTab = pathParts[pathParts.length - 1];
    const basePath = location.pathname.replace(/\/[^/]+$/, '');

    const switchTab = (tab: string) => {
        navigate(`${basePath}/${tab}`);
    };

    return (
        <HealingProvider>
            <div className="flex flex-col h-full bg-gray-50">
                <div className="p-8 space-y-8 animate-in fade-in duration-500 relative flex-1 overflow-y-auto scroll-smooth">
                    {/* Header */}
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-ministry-text mb-1">Healing Dept</h1>
                            <p className="text-gray-500">Manage hospital outreaches, souls won, and testimonies.</p>
                        </div>
                        <div className="flex space-x-3">
                            {(activeTab === 'overview' || activeTab === 'reports') && (
                                <button
                                    onClick={() => switchTab('new')}
                                    className="flex items-center space-x-2 bg-ministry-orange text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 transition-colors font-bold shadow-lg shadow-orange-500/20"
                                >
                                    <Plus size={18} />
                                    <span>New Outreach Report</span>
                                </button>
                            )}
                        </div>
                    </header>

                    {/* Navigation Tabs */}
                    <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit">
                        {HEALING_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => switchTab(tab.id)}
                                className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize ${activeTab === tab.id ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                
                    {/* Content will render here via Outlet */}
                    <Outlet />
                    
                    {/* Modals outside normal layout flow */}
                    <HealingModals />
                </div>
            </div>
        </HealingProvider>
    );
};

export default HealingLayout;
