import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { BookOpen, FileText, Calendar } from 'lucide-react';

const TABS = [
    { id: 'reports', label: 'Outreach Reports', mobileLabel: 'Reports', icon: FileText },
    { id: 'events',  label: 'Events & Students', mobileLabel: 'Events',  icon: Calendar },
];

export const SchoolsTabsLayout: React.FC = () => {
    const location = useLocation();

    // Derive base path for NavLink `to` construction
    const pathParts = location.pathname.split('/');
    // basePath = everything up to but not including the last segment
    const basePath = pathParts.slice(0, -1).join('/');

    return (
        <div className="flex flex-col min-h-full bg-gray-50">

            {/* ── Header — always visible ────────────────────────────────── */}
            <div className="px-4 md:px-8 pt-4 md:pt-8 pb-0">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-ministry-text flex items-center gap-2 md:gap-3">
                            <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-ministry-orange" />
                            Schools Department
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">Manage outreach reports and student event attendance.</p>
                    </div>
                </div>

                {/* Desktop tab strip — hidden on mobile */}
                <div className="hidden md:flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit mb-6">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <NavLink
                                key={tab.id}
                                to={`${basePath}/${tab.id}`}
                                className={({ isActive }) =>
                                    `flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-ministry-neon' : ''}`} />
                                        <span>{tab.label}</span>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
            </div>

            {/* ── Content ────────────────────────────────────────────────── */}
            {/* Desktop: card wrapper. Mobile: edge-to-edge, no extra padding */}
            <div className="flex-1 mb-20 md:mb-0 px-0 md:px-8 md:pb-8">
                <div className="bg-white md:bg-ministry-card md:border md:border-gray-200 md:rounded-2xl md:shadow-sm min-h-[400px]">
                    <React.Suspense fallback={<div className="flex items-center justify-center h-full w-full min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div></div>}>
<Outlet />
</React.Suspense>
                </div>
            </div>

            {/* ── Mobile Floating Bottom Navigation ──────────────────────── */}
            <div className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-[80%] max-w-xs">
                <div className="flex items-center justify-around bg-white/75 backdrop-blur-2xl p-2 rounded-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    {TABS.map(({ id, mobileLabel, icon: Icon }) => (
                        <NavLink
                            key={id}
                            to={`${basePath}/${id}`}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center w-full py-2 rounded-full transition-all duration-300 relative overflow-hidden ${isActive ? 'text-ministry-neon' : 'text-gray-500 hover:text-gray-900'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className="absolute inset-0 bg-black rounded-full animate-in zoom-in duration-300" />}
                                    <div className="relative z-10 flex flex-col items-center gap-1">
                                        <Icon strokeWidth={isActive ? 2.5 : 2} className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'text-ministry-neon scale-110' : ''}`} />
                                        <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold text-ministry-neon' : 'font-medium'}`}>{mobileLabel}</span>
                                    </div>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );
};
