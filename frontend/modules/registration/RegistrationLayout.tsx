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


                {/* ── Active page content ────────────────────────────────────── */}
                <div className="flex-1 relative p-6">
                    <Outlet />
                </div>
            </div>
            
            {/* ── Modals Layer ───────────────────────────────────────────── */}
            <RegistrationModals />
        </RegistrationProvider>
    );
};

export default RegistrationLayout;
