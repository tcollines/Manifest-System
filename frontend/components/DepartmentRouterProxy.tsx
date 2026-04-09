import React from 'react';
import { useParams, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { MinistryEvent, ModalType, User } from '../types';

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
import SchoolsReportsPage from '../modules/schools/SchoolsReportsPage';
import SchoolsEventsPage from '../modules/schools/SchoolsEventsPage';

import CampusLayout from '../modules/campus/CampusLayout';
import CampusFamiliesPage from '../modules/campus/CampusFamiliesPage';
import CampusEvangelismPage from '../modules/campus/CampusEvangelismPage';
import CampusVacistsPage from '../modules/campus/CampusVacistsPage';
import CampusAlumniPage from '../modules/campus/CampusAlumniPage';
import CampusFinanceDashboard from './CampusFinanceDashboard';
import CampusMinistryEvents from './CampusMinistryEvents';

// Residents 
import ResidentLayout from '../modules/residents/ResidentLayout';
import ResidentOverviewPage from '../modules/residents/ResidentOverviewPage';
import ResidentResidencesPage from '../modules/residents/ResidentResidencesPage';
import ResidentReportsPage from '../modules/residents/ResidentReportsPage';
import CoordinatorResidencyDashboard from './CoordinatorResidencyDashboard';

// Custom Dashboards
import NextGenFollowUp from './NextGenFollowUp';
import NextGenTeam from './NextGenTeam';
import NextGenReports from './NextGenReports';
import StageCoordinatorDashboard from './StageCoordinatorDashboard';

// Dynamic/Generic Dashboard 
import GenericDeptDashboard from '../modules/generic-dept/GenericDeptDashboard';

// Map specific custom dashboards if needed, else fallback
import DepartmentDetail from './DepartmentDetail';
import DepartmentRequests from './DepartmentRequests';

interface ProxyProps {
    events: MinistryEvent[];
    onOpenModal: (t: ModalType) => void;
    onEditUser: (u: User) => void;
    refreshParentData?: () => void;
}

const DepartmentRouterProxy: React.FC<ProxyProps> = ({ events, onOpenModal, onEditUser, refreshParentData }) => {
    const { deptId } = useParams<{ deptId: string }>();
    const { user } = useAuth();
    const currentUser = user; // local alias for passing to child modules

    // Safeguard
    if (!deptId) return <Navigate to="/departments" replace />;

    // ── Registration (d1) ────────────────────────────────────────────────────────
    if (deptId === 'd1' || deptId === 'registration') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['d1']} bypassRoles={['Logistics']} />}>
                    <Route element={<RegistrationLayout currentUser={currentUser} />}>
                        <Route index element={<Navigate to={currentUser?.role === 'Logistics' ? 'events' : 'check-in'} replace />} />
                        <Route path="check-in" element={<CheckInPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} refreshParentData={refreshParentData as any} />} />
                        <Route path="events" element={<EventsPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} refreshParentData={refreshParentData as any} />} />
                        <Route path="database" element={<DatabasePage events={events} currentUser={currentUser} onOpenModal={onOpenModal} refreshParentData={refreshParentData as any} />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Next Gen (d2) ────────────────────────────────────────────────────────────
    if (deptId === 'd2' || deptId === 'next-gen') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['d2']} />}>
                    <Route element={<NextGenLayout />}>
                        <Route index element={<Navigate to="checkin" replace />} />
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
    if (deptId === 'd3' || deptId === 'parking') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['d3']} />}>
                    <Route element={<ParkingLayout />}>
                        <Route index element={<Navigate to="checkin" replace />} />
                        <Route path="checkin" element={<ParkingCheckInPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                        <Route path="database" element={<ParkingDatabasePage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Finance (d4) ─────────────────────────────────────────────────────────────
    if (deptId === 'd4' || deptId === 'finance') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['d4']} />}>
                    <Route element={<FinanceLayout currentUser={currentUser!} />}>
                        <Route index element={<Navigate to="income" replace />} />
                        <Route path="income"       element={<IncomePage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="expenses"     element={<ExpensesPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="requisitions" element={<FinanceRequisitionsPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="fleet"        element={<FleetPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Transportation (d5) ──────────────────────────────────────────────────────
    if (deptId === 'd5' || deptId === 'transportation') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['4630e48a-f97e-48fd-a901-864b591c282f', 'd5']} />}>
                    <Route element={<TransportationLayout />}>
                        <Route index element={<Navigate to="overview" replace />} />
                        <Route path="overview"     element={<OverviewPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="coordinators" element={<CoordinatorsPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="stages"       element={<StagesPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                    </Route>
                    <Route path="stage-dashboard" element={<StageCoordinatorDashboard currentUser={currentUser!} events={events} onOpenModal={onOpenModal} />} />
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Follow-Up (d6) ───────────────────────────────────────────────────────────
    if (deptId === 'd6' || deptId === 'follow-up') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['d6']} />}>
                    <Route element={<FollowUpLayout />}>
                        <Route index element={<Navigate to="services" replace />} />
                        <Route path="services"     element={<FollowUpServicesPage currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="events"       element={<FollowUpEventsPage currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="database"     element={<FollowUpDatabasePage currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="first-timers" element={<FollowUpFirstTimersPage currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="members"      element={<FollowUpMembersPage currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="analysis"     element={<FollowUpAnalysisPage currentUser={currentUser} onOpenModal={onOpenModal} />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Schools (d7) ─────────────────────────────────────────────────────────────
    if (deptId === 'd7' || deptId === 'schools') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['d7']} />}>
                    <Route element={<SchoolsLayout />}>
                        <Route index element={<Navigate to="reports" replace />} />
                        <Route path="reports" element={<SchoolsReportsPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                        <Route path="events" element={<SchoolsEventsPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Healing (d8) ─────────────────────────────────────────────────────────────
    if (deptId === 'd8' || deptId === 'healing') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['d8']} />}>
                    <Route element={<HealingLayout />}>
                        <Route index element={<Navigate to="overview" replace />} />
                        <Route path="overview" element={<HealingOverviewPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                        <Route path="reports" element={<HealingReportsPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                        <Route path="souls" element={<HealingSoulsPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                        <Route path="testimonies" element={<HealingTestimoniesPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                        <Route path="new" element={<HealingNewPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Campus (d9) ──────────────────────────────────────────────────────────────
    if (deptId === 'd9' || deptId === 'campus') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['d9']} />}>
                    <Route element={<CampusLayout />}>
                        <Route index element={<Navigate to="families" replace />} />
                        <Route path="families" element={<CampusFamiliesPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                        <Route path="evangelism" element={<CampusEvangelismPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                        <Route path="vacists" element={<CampusVacistsPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                        <Route path="alumni" element={<CampusAlumniPage currentUser={currentUser} events={events} onOpenModal={onOpenModal} />} />
                        <Route path="finance" element={<CampusFinanceDashboard currentUser={currentUser!} />} />
                    </Route>
                    <Route path="events" element={<CampusMinistryEvents events={events} />} />
                    <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Residents (d10) ────────────────────────────────────────────────────────
    if (deptId === 'd10' || deptId === 'residents') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedRoles={['Administrator', 'Super Admin']} />}>
                    <Route element={<ResidentLayout />}>
                        <Route index element={<Navigate to="overview" replace />} />
                        <Route path="overview"   element={<ResidentOverviewPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="residences" element={<ResidentResidencesPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                        <Route path="reports"    element={<ResidentReportsPage events={events} currentUser={currentUser} onOpenModal={onOpenModal} />} />
                    </Route>
                </Route>
                <Route element={<ProtectedRoute allowedRoles={['Resident Coordinator']} />}>
                    <Route path="my-residency" element={<CoordinatorResidencyDashboard currentUser={currentUser!} />} />
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
                <Route path="requests" element={<DepartmentDetail />}> {/* The current pattern wraps request in DepartmentDetail */}
                    <Route index element={<DepartmentRequests />} /> 
                </Route>
                <Route path="dashboard/*" element={<GenericDeptDashboard currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
            </Route>
        </Routes>
    );
};

export default DepartmentRouterProxy;
