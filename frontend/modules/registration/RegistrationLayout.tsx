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
        : [
            { to: 'check-in',  icon: ClipboardCheck, label: 'Check-In' },
            { to: 'events',    icon: Calendar,       label: 'Events' },
            { to: 'database',  icon: Database,       label: 'Database' },
          ];

    return (
        <RegistrationProvider>
            <div className="flex flex-col min-h-full bg-gray-50">
                {/* ── NavLink tab bar ────────────────────────────────────────── */}
                {(!isLogisticsRole && isElevated) && (
                    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-1 flex-wrap sticky top-0 z-20">
                        {tabs.map(({ to, icon: Icon, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                                        isActive
                                            ? 'bg-black text-white'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                    }`
                                }
                            >
                                <Icon className="w-4 h-4" /> {label}
                            </NavLink>
                        ))}
                    </div>
                )}

                {/* ── Active page content ────────────────────────────────────── */}
                <div className="flex-1 relative">
                    <Outlet />
                </div>
            </div>
            
            {/* ── Modals Layer ───────────────────────────────────────────── */}
            <RegistrationModals />
        </RegistrationProvider>
    );
};

export default RegistrationLayout;
