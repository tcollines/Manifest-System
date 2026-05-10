/**
 * RegistrationLayout
 *
 * State host and context provider for the Registration module.
 *
 * RESPONSIBILITIES:
 *   1. Reads events + user from global contexts (useAuth, useEvent)
 *   2. Provides them via RegistrationContext to all child pages
 *   3. Renders the NavLink tab bar (replaces the old tab bar that was
 *      removed from RegistrationDashboard in Phase B)
 *   4. Renders <Outlet /> for the active route/tab
 *
 * HYBRID MODE:
 *   RegistrationDashboard.tsx monolith remains active for all sections.
 *   This layout purely eliminates prop-drilling and restores the NavLink
 *   tab navigation that was missing after Phase B.
 *
 * Pattern mirrors TransportationLayout / FinanceLayout / FollowUpLayout.
 */

import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { ClipboardCheck, Calendar, Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { RegistrationProvider } from './RegistrationContext';
import RegistrationModals from './components/RegistrationModals';
import { hasLogisticsAccess } from '../../domain/rbac';

const RegistrationLayout: React.FC = () => {
    // ── Tab definitions ───────────────────────────────────────────────────────
    // Logistics users are locked to the Events tab (they manage stations/vehicles)
    const { user } = useAuth();
    const isLogisticsRole = hasLogisticsAccess(user);
    const isElevated = user ? ['Administrator', 'Super Admin', 'Head of Dept', 'HOD', 'Department Head', 'Dept Admin', 'Reg. Admin', 'Registration Admin', 'Registration Head', 'TeamLeader'].includes(user.role) : false;

    const tabs = isLogisticsRole
        ? [{ to: 'events', icon: Calendar, label: 'Logistics Entry' }]
        : isElevated
            ? [
                { to: 'check-in',  icon: ClipboardCheck, label: 'Check-In' },
                { to: 'events',    icon: Calendar,       label: 'Events' },
                { to: 'database',  icon: Database,       label: 'Database' },
              ]
            : [
                { to: 'check-in',  icon: ClipboardCheck, label: 'Check-In' }
              ];

    return (
        <RegistrationProvider>
            <div className="flex flex-col min-h-full bg-gray-50 pb-24 md:pb-0">
                {/* ── Desktop Tabs (Hidden on mobile) ────────────────────────── */}
                {tabs.length > 1 && (
                    <div className="hidden md:block w-full overflow-x-auto hide-scrollbar pt-6 px-6">
                        <div className="inline-flex items-center gap-1 bg-white/60 backdrop-blur-md p-1.5 rounded-full border border-gray-100 shadow-sm">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <NavLink
                                    key={tab.to}
                                    to={tab.to}
                                    className={({ isActive }) =>
                                        `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                                            isActive
                                                ? 'bg-black text-white shadow-md ring-1 ring-gray-200/50'
                                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon strokeWidth={2.5} className={`w-4 h-4 ${isActive ? 'text-ministry-neon' : ''}`} />
                                            {tab.label}
                                        </>
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                </div>
                )}

                {/* ── Active page content ────────────────────────────────────── */}
                <div className="flex-1 relative p-4 md:p-6 mb-20 md:mb-0">
                    <Outlet />
                </div>
            </div>

            {/* ── Mobile Floating Bottom Navigation ────────────────────────── */}
            {tabs.length > 1 && (
                <div className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm">
                    <div className="flex items-center justify-between gap-1 bg-white/75 backdrop-blur-2xl p-2 rounded-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <NavLink
                                key={tab.to}
                                to={tab.to}
                                className={({ isActive }) =>
                                    `flex flex-col items-center justify-center w-full py-2 rounded-full transition-all duration-300 relative overflow-hidden ${
                                        isActive ? 'text-ministry-neon' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <div className="absolute inset-0 bg-black rounded-full scale-100 animate-in zoom-in duration-300" />
                                        )}
                                        <div className="relative z-10 flex flex-col items-center gap-1">
                                            <Icon strokeWidth={isActive ? 2.5 : 2} className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'text-ministry-neon scale-110' : ''}`} />
                                            <span className={`text-[10px] tracking-wide transition-all duration-300 ${isActive ? 'font-bold text-ministry-neon' : 'font-medium'}`}>
                                                {tab.label}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
            </div>
            )}
            
            {/* ── Modals Layer ───────────────────────────────────────────── */}
            <RegistrationModals />
        </RegistrationProvider>
    );
};

export default RegistrationLayout;
