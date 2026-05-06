import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Shield, FileText, Users, HeartHandshake, Plus } from 'lucide-react';
import { HealingProvider } from './HealingContext';
import { HealingModals } from './HealingModals';

const HEALING_TABS = [
    { id: 'overview',    label: 'Overview',    mobileLabel: 'Overview',  icon: Shield },
    { id: 'reports',     label: 'Reports',     mobileLabel: 'Reports',   icon: FileText },
    { id: 'souls',       label: 'Souls Won',   mobileLabel: 'Souls',     icon: Users },
    { id: 'testimonies', label: 'Testimonies', mobileLabel: 'Testimony', icon: HeartHandshake },
];

const HealingLayout: React.FC = () => {
    const location = useLocation();

    const pathParts = location.pathname.split('/');
    const activeTab = pathParts[pathParts.length - 1];
    const basePath = pathParts.slice(0, -1).join('/');

    return (
        <HealingProvider>
            <div className="flex flex-col min-h-full bg-gray-50">

                {/* ── Header ──────────────────────────────────────────── */}
                <div className="px-4 md:px-8 pt-4 md:pt-8 pb-0">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold text-ministry-text">Healing Dept</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Manage hospital outreaches, souls won, and testimonies.</p>
                        </div>
                        {(activeTab === 'overview' || activeTab === 'reports') && (
                            <NavLink
                                to={`${basePath}/new`}
                                className="flex items-center gap-1.5 bg-ministry-orange text-white px-3 py-2 rounded-xl font-bold shadow-lg shadow-orange-500/20 text-sm shrink-0"
                            >
                                <Plus size={16} />
                                <span className="hidden md:inline">New Outreach Report</span>
                                <span className="md:hidden">New</span>
                            </NavLink>
                        )}
                    </div>

                    {/* Desktop tab strip */}
                    <div className="hidden md:flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit mb-6">
                        {HEALING_TABS.map(({ id, label, icon: Icon }) => (
                            <NavLink
                                key={id}
                                to={`${basePath}/${id}`}
                                className={({ isActive }) =>
                                    `flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize ${isActive ? 'bg-white text-ministry-text shadow-sm' : 'text-gray-500 hover:text-gray-900'}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-ministry-orange' : ''}`} />
                                        <span>{label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </div>

                {/* ── Content ─────────────────────────────────────────── */}
                <div className="flex-1 mb-20 md:mb-0 px-0 md:px-8 md:pb-8">
                    <Outlet />
                </div>

                {/* ── Mobile Floating Bottom Navigation ───────────────── */}
                <div className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm">
                    <div className="flex items-center justify-around bg-white/75 backdrop-blur-2xl p-2 rounded-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                        {HEALING_TABS.map(({ id, mobileLabel, icon: Icon }) => (
                            <NavLink
                                key={id}
                                to={`${basePath}/${id}`}
                                className={({ isActive }) =>
                                    `flex flex-col items-center justify-center flex-1 py-2 rounded-full transition-all duration-300 relative overflow-hidden ${isActive ? 'text-ministry-neon' : 'text-gray-500'}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && <div className="absolute inset-0 bg-black rounded-full animate-in zoom-in duration-300" />}
                                        <div className="relative z-10 flex flex-col items-center gap-0.5">
                                            <Icon strokeWidth={isActive ? 2.5 : 2} className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'text-ministry-neon scale-110' : ''}`} />
                                            <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold text-ministry-neon' : 'font-medium'}`}>{mobileLabel}</span>
                                        </div>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </div>

                <HealingModals />
            </div>
        </HealingProvider>
    );
};

export default HealingLayout;
