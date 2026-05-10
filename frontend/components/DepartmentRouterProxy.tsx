import React from 'react';
import { useParams, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { ModalType, User } from '../types';
import { hasLogisticsAccess } from '../domain/rbac';
import { resolveDepartment } from '../constants/departmentMap';

// Core Department Layouts
import RegistrationLayout from '../modules/registration/RegistrationLayout';
import CheckInPage from '../modules/registration/CheckInPage';
import EventsPage from '../modules/registration/EventsPage';
import DatabasePage from '../modules/registration/DatabasePage';

import NextGenLayout from '../modules/next-gen/NextGenLayout';
import NextGenCheckInPage from '../modules/next-gen/NextGenCheckInPage';
import NextGenCheckOutPage from '../modules/next-gen/NextGenCheckOutPage';
import NextGenDatabasePage from '../modules/next-gen/NextGenDatabasePage';
import NextGenSoulsPage from '../modules/next-gen/NextGenSoulsPage';

import ParkingLayout from '../modules/parking/ParkingLayout';
import ParkingCheckInPage from '../modules/parking/ParkingCheckinPage';
import ParkingDatabasePage from '../modules/parking/ParkingDatabasePage';

import FinanceLayout from '../modules/finance/FinanceLayout';
import FinanceDashboardPage from '../modules/finance/DashboardPage';
import IncomePage from '../modules/finance/IncomePage';
import ExpensesPage from '../modules/finance/ExpensesPage';
import FinanceRequisitionsPage from '../modules/finance/FinanceRequisitionsPage';
import FleetPage from '../modules/finance/FleetPage';

import HealingLayout from '../modules/healing/HealingLayout';
import HealingOverviewPage from '../modules/healing/HealingOverviewPage';
import HealingReportsPage from '../modules/healing/HealingReportsPage';
import HealingSoulsPage from '../modules/healing/HealingSoulsPage';
import HealingTestimoniesPage from '../modules/healing/HealingTestimoniesPage';
import HealingNewPage from '../modules/healing/HealingNewPage';

import TransportationLayout from '../modules/transportation/TransportationLayout';
import OverviewPage from '../modules/transportation/OverviewPage';
import CoordinatorsPage from '../modules/transportation/CoordinatorsPage';
import StagesPage from '../modules/transportation/StagesPage';

import FollowUpLayout from '../modules/follow-up/FollowUpLayout';
import FollowUpServicesPage from '../modules/follow-up/FollowUpServicesPage';
import FollowUpEventsPage from '../modules/follow-up/FollowUpEventsPage';
import FollowUpDatabasePage from '../modules/follow-up/FollowUpDatabasePage';
import FollowUpFirstTimersPage from '../modules/follow-up/FollowUpFirstTimersPage';
import FollowUpMembersPage from '../modules/follow-up/FollowUpMembersPage';
import FollowUpAnalysisPage from '../modules/follow-up/FollowUpAnalysisPage';

import SchoolsLayout from '../modules/schools/SchoolsLayout';
import { SchoolsTabsLayout } from '../modules/schools/SchoolsTabsLayout';
import { ReportsTab as SchoolsReportsTab } from '../modules/schools/tabs/ReportsTab';
import { EventsTab as SchoolsEventsTab } from '../modules/schools/tabs/EventsTab';

// Campus Domain (Modularized)
import CampusLayout from '../modules/campus/CampusLayout';
import { CampusTabsLayout } from '../modules/campus/CampusTabsLayout';
import { ActivityTab } from '../modules/campus/tabs/ActivityTab';
import CampusFinanceDashboard from '../modules/campus/tabs/CampusFinancePage';
import CampusMinistryEvents from './CampusMinistryEvents';

// Residents 
import ResidentLayout from '../modules/residents/ResidentLayout';
import { ResidentTabsLayout } from '../modules/residents/ResidentTabsLayout';
import OverviewTab from '../modules/residents/tabs/OverviewTab';
import ResidencesTab from '../modules/residents/tabs/ResidencesTab';
import ReportsTab from '../modules/residents/tabs/ReportsTab';
// Coordinator (my-residency) — modular replacement for CoordinatorResidencyDashboard
import ResidentCoordinatorLayout from '../modules/residents/ResidentCoordinatorLayout';
import CoordinatorReportsPage from '../modules/residents/CoordinatorReportsPage';
import CoordinatorMembersPage from '../modules/residents/CoordinatorMembersPage';
import CoordinatorEventsPage from '../modules/residents/CoordinatorEventsPage';

// Custom Dashboards
import NextGenFollowUp from './NextGenFollowUp';
import NextGenTeam from './NextGenTeam';
import NextGenReports from './NextGenReports';
import StageCoordinatorDashboard from '../modules/transportation/StageCoordinatorDashboard';

// Dynamic/Generic Dashboard 
import GenericDeptDashboard from '../modules/generic-dept/GenericDeptDashboard';

// Map specific custom dashboards if needed, else fallback
import DepartmentDetail from './DepartmentDetail';

const RedirectWithParams = ({ to }: { to: string }) => {
    const { search } = useLocation();
    return <Navigate to={{ pathname: to, search }} replace />;
};

interface ProxyProps {
    onOpenModal: (t: ModalType) => void;
    onEditUser: (u: User) => void;
}

const DepartmentRouterProxy: React.FC<ProxyProps> = ({ onOpenModal, onEditUser }) => {
    const { deptId } = useParams<{ deptId: string }>();
    const { user } = useAuth();
    const { events, refreshEvents } = useEvent();
    const currentUser = user;

    // Safeguard
    if (!deptId) return <Navigate to="/departments" replace />;

    const dept = resolveDepartment(deptId);

    // ── Registration (d1) ────────────────────────────────────────────────────────
    if (dept?.slug === 'registration') {
        const isElevated = currentUser ? ['Administrator', 'Super Admin', 'Head of Dept', 'HOD', 'Department Head', 'Dept Admin', 'Reg. Admin', 'Registration Admin', 'Registration Head', 'TeamLeader'].includes(currentUser.role) : false;
        
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['registration']} bypassRoles={['Logistics']} />}>
                    <Route element={<RegistrationLayout />}>
                        <Route index element={<RedirectWithParams to={hasLogisticsAccess(user) ? 'events' : 'check-in'} />} />
                        <Route path="check-in" element={<CheckInPage />} />
                        {(isElevated || hasLogisticsAccess(user)) && (
                            <Route path="events"   element={<EventsPage />} />
                        )}
                        {isElevated && (
                            <Route path="database" element={<DatabasePage />} />
                        )}
                        {/* Fallback for unauthorized navigation */}
                        {!isElevated && !hasLogisticsAccess(user) && (
                            <Route path="*" element={<Navigate to="check-in" replace />} />
                        )}
                    </Route>
                    {isElevated && (
                        <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                    )}
                </Route>
            </Routes>
        );
    }

    // ── Next Gen (d2) ────────────────────────────────────────────────────────────
    if (dept?.slug === 'next-gen') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['next-gen']} />}>
                    <Route element={<NextGenLayout />}>
                        <Route index element={<RedirectWithParams to="checkin" />} />
                        <Route path="checkin"  element={<NextGenCheckInPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="checkout" element={<NextGenCheckOutPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="database" element={<NextGenDatabasePage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="souls"    element={<NextGenSoulsPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                    </Route>
                    {/* Siblings */}
                    <Route path="follow-up" element={<NextGenFollowUp currentUser={currentUser!} events={events} />} />
                    <Route path="team" element={<NextGenTeam currentUser={currentUser!} />} />
                    <Route path="reports" element={<NextGenReports />} />
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Parking (d3) ─────────────────────────────────────────────────────────────
    if (dept?.slug === 'parking') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['parking']} />}>
                    <Route element={<ParkingLayout />}>
                        <Route index element={<RedirectWithParams to="checkin" />} />
                        <Route path="checkin" element={<ParkingCheckInPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                        <Route path="database" element={<ParkingDatabasePage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Finance (d4) ─────────────────────────────────────────────────────────────
    if (dept?.slug === 'finance') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['finance']} />}>
                    <Route element={<FinanceLayout />}>
                        <Route index element={<RedirectWithParams to="overview" />} />
                        <Route path="overview"     element={<FinanceDashboardPage />} />
                        <Route path="income"       element={<IncomePage />} />
                        <Route path="expenses"     element={<ExpensesPage />} />
                        <Route path="requisitions" element={<FinanceRequisitionsPage />} />
                        <Route path="fleet"        element={<FleetPage />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Transportation (d5) ──────────────────────────────────────────────────────
    if (dept?.slug === 'transportation') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['transportation']} />}>
                    <Route element={<TransportationLayout />}>
                        <Route index element={<RedirectWithParams to="overview" />} />
                        <Route path="overview"     element={<OverviewPage />} />
                        <Route path="coordinators" element={<CoordinatorsPage />} />
                        <Route path="stages"       element={<StagesPage />} />
                        <Route path="stage-dashboard" element={<StageCoordinatorDashboard />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Follow-Up (d6) ───────────────────────────────────────────────────────────
    if (dept?.slug === 'follow-up') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['follow-up']} />}>
                    <Route element={<FollowUpLayout />}>
                        <Route index element={<RedirectWithParams to="services" />} />
                        <Route path="services"     element={<FollowUpServicesPage />} />
                        <Route path="events"       element={<FollowUpEventsPage />} />
                        <Route path="database"     element={<FollowUpDatabasePage />} />
                        <Route path="first-timers" element={<FollowUpFirstTimersPage />} />
                        <Route path="members"      element={<FollowUpMembersPage />} />
                        <Route path="analysis"     element={<FollowUpAnalysisPage />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Schools (d7) ─────────────────────────────────────────────────────────────
    if (dept?.slug === 'schools') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['schools']} />}>
                    <Route element={<SchoolsLayout events={events} />}>
                        <Route element={<SchoolsTabsLayout />}>
                            <Route index element={<RedirectWithParams to="reports" />} />
                            <Route path="reports" element={<SchoolsReportsTab />} />
                            <Route path="events" element={<SchoolsEventsTab />} />
                        </Route>
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Healing (d8) ─────────────────────────────────────────────────────────────
    if (dept?.slug === 'healing') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['healing']} />}>
                    <Route element={<HealingLayout />}>
                        <Route index element={<RedirectWithParams to="overview" />} />
                        <Route path="overview" element={<HealingOverviewPage />} />
                        <Route path="reports" element={<HealingReportsPage />} />
                        <Route path="souls" element={<HealingSoulsPage />} />
                        <Route path="testimonies" element={<HealingTestimoniesPage />} />
                        <Route path="new" element={<HealingNewPage />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Campus (d9) ──────────────────────────────────────────────────────────────
    if (dept?.slug === 'campus') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['campus']} />}>
                    <Route element={<CampusLayout events={events} />}>
                        <Route element={<CampusTabsLayout />}>
                            <Route index element={<RedirectWithParams to="families" />} />
                            <Route path="families" element={<ActivityTab category="Family" />} />
                            <Route path="evangelism" element={<ActivityTab category="Evangelism" />} />
                            <Route path="vacists" element={<ActivityTab category="Vacists" />} />
                            <Route path="alumni" element={<ActivityTab category="Alumni" />} />
                        </Route>
                        <Route path="finance" element={<CampusFinanceDashboard />} />
                    </Route>
                    <Route path="events" element={<CampusMinistryEvents events={events} />} />
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Residents (d10) ────────────────────────────────────────────────────────
    if (dept?.slug === 'residents') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedRoles={['Administrator', 'Super Admin']} />}>
                    <Route element={<ResidentLayout events={events} />}>
                        <Route element={<ResidentTabsLayout />}>
                            <Route index element={<RedirectWithParams to="overview" />} />
                            <Route path="overview"   element={<OverviewTab />} />
                            <Route path="residences" element={<ResidencesTab />} />
                            <Route path="reports"    element={<ReportsTab />} />
                        </Route>
                    </Route>
                </Route>
                <Route element={<ProtectedRoute allowedRoles={['Resident Coordinator']} />}>
                    <Route path="my-residency" element={<ResidentCoordinatorLayout />}>
                        <Route index element={<RedirectWithParams to="reports" />} />
                        <Route path="reports" element={<CoordinatorReportsPage />} />
                        <Route path="members" element={<CoordinatorMembersPage />} />
                        <Route path="events"  element={<CoordinatorEventsPage />} />
                    </Route>
                </Route>
            </Routes>
        );
    }

    // ── Dynamic Custom Database Departments ─────────────────────────────────────
    // For anything else, route to GenericDeptDashboard OR DepartmentDetail
    return (
        <Routes>
            <Route element={<ProtectedRoute allowedDepartments={[deptId]} />}>
                <Route index element={<DepartmentDetail />} />

                <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
            </Route>
        </Routes>
    );
};

export default DepartmentRouterProxy;
