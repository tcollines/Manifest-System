import React from 'react';
import { useParams, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { ModalType, User } from '../types';
import { hasLogisticsAccess } from '../domain/rbac';
import { resolveDepartment } from '../constants/departmentMap';

// Core Department Layouts (Lazy Loaded)
const RegistrationLayout = React.lazy(() => import('../modules/registration/RegistrationLayout'));
const CheckInPage = React.lazy(() => import('../modules/registration/CheckInPage'));
const EventsPage = React.lazy(() => import('../modules/registration/EventsPage'));
const DatabasePage = React.lazy(() => import('../modules/registration/DatabasePage'));

const NextGenLayout = React.lazy(() => import('../modules/next-gen/NextGenLayout'));
const NextGenCheckInPage = React.lazy(() => import('../modules/next-gen/NextGenCheckInPage'));
const NextGenCheckOutPage = React.lazy(() => import('../modules/next-gen/NextGenCheckOutPage'));
const NextGenDatabasePage = React.lazy(() => import('../modules/next-gen/NextGenDatabasePage'));
const NextGenSoulsPage = React.lazy(() => import('../modules/next-gen/NextGenSoulsPage'));

const ParkingLayout = React.lazy(() => import('../modules/parking/ParkingLayout'));
const ParkingCheckInPage = React.lazy(() => import('../modules/parking/ParkingCheckinPage'));
const ParkingDatabasePage = React.lazy(() => import('../modules/parking/ParkingDatabasePage'));

const FinanceLayout = React.lazy(() => import('../modules/finance/FinanceLayout'));
const FinanceDashboardPage = React.lazy(() => import('../modules/finance/DashboardPage'));
const IncomePage = React.lazy(() => import('../modules/finance/IncomePage'));
const ExpensesPage = React.lazy(() => import('../modules/finance/ExpensesPage'));
const FinanceRequisitionsPage = React.lazy(() => import('../modules/finance/FinanceRequisitionsPage'));
const FleetPage = React.lazy(() => import('../modules/finance/FleetPage'));

const HealingLayout = React.lazy(() => import('../modules/healing/HealingLayout'));
const HealingOverviewPage = React.lazy(() => import('../modules/healing/HealingOverviewPage'));
const HealingReportsPage = React.lazy(() => import('../modules/healing/HealingReportsPage'));
const HealingSoulsPage = React.lazy(() => import('../modules/healing/HealingSoulsPage'));
const HealingTestimoniesPage = React.lazy(() => import('../modules/healing/HealingTestimoniesPage'));
const HealingNewPage = React.lazy(() => import('../modules/healing/HealingNewPage'));

const TransportationLayout = React.lazy(() => import('../modules/transportation/TransportationLayout'));
const OverviewPage = React.lazy(() => import('../modules/transportation/OverviewPage'));
const CoordinatorsPage = React.lazy(() => import('../modules/transportation/CoordinatorsPage'));
const StagesPage = React.lazy(() => import('../modules/transportation/StagesPage'));

const FollowUpLayout = React.lazy(() => import('../modules/follow-up/FollowUpLayout'));
const FollowUpServicesPage = React.lazy(() => import('../modules/follow-up/FollowUpServicesPage'));
const FollowUpEventsPage = React.lazy(() => import('../modules/follow-up/FollowUpEventsPage'));
const FollowUpDatabasePage = React.lazy(() => import('../modules/follow-up/FollowUpDatabasePage'));
const FollowUpFirstTimersPage = React.lazy(() => import('../modules/follow-up/FollowUpFirstTimersPage'));
const FollowUpMembersPage = React.lazy(() => import('../modules/follow-up/FollowUpMembersPage'));
const FollowUpAnalysisPage = React.lazy(() => import('../modules/follow-up/FollowUpAnalysisPage'));
const FollowUpQueriesPage = React.lazy(() => import('../modules/follow-up/FollowUpQueriesPage'));

const SchoolsLayout = React.lazy(() => import('../modules/schools/SchoolsLayout'));
const SchoolsTabsLayout = React.lazy(() => import('../modules/schools/SchoolsTabsLayout').then(m => ({ default: m.SchoolsTabsLayout })));
const SchoolsReportsTab = React.lazy(() => import('../modules/schools/tabs/ReportsTab').then(m => ({ default: m.ReportsTab })));
const SchoolsEventsTab = React.lazy(() => import('../modules/schools/tabs/EventsTab').then(m => ({ default: m.EventsTab })));

// Campus Domain (Modularized)
const CampusLayout = React.lazy(() => import('../modules/campus/CampusLayout'));
const CampusTabsLayout = React.lazy(() => import('../modules/campus/CampusTabsLayout').then(m => ({ default: m.CampusTabsLayout })));
const ActivityTab = React.lazy(() => import('../modules/campus/tabs/ActivityTab').then(m => ({ default: m.ActivityTab })));
const CampusFinanceDashboard = React.lazy(() => import('../modules/campus/tabs/CampusFinancePage'));
const CampusMinistryEvents = React.lazy(() => import('./CampusMinistryEvents'));

// Residents 
const ResidentLayout = React.lazy(() => import('../modules/residents/ResidentLayout'));
const ResidentTabsLayout = React.lazy(() => import('../modules/residents/ResidentTabsLayout').then(m => ({ default: m.ResidentTabsLayout })));
const OverviewTab = React.lazy(() => import('../modules/residents/tabs/OverviewTab'));
const ResidencesTab = React.lazy(() => import('../modules/residents/tabs/ResidencesTab'));
const ReportsTab = React.lazy(() => import('../modules/residents/tabs/ReportsTab'));

// Sales & Merchandise
const SalesLayout = React.lazy(() => import('../modules/sales/SalesLayout'));
const POSPage = React.lazy(() => import('../modules/sales/pages/POSPage'));
const ProductsPage = React.lazy(() => import('../modules/sales/pages/ProductsPage'));
const InventoryPage = React.lazy(() => import('../modules/sales/pages/InventoryPage'));
const OrdersPage = React.lazy(() => import('../modules/sales/pages/OrdersPage'));
const CustomersPage = React.lazy(() => import('../modules/sales/pages/CustomersPage'));
const ProcurementPage = React.lazy(() => import('../modules/sales/pages/ProcurementPage'));
const SalesDashboardPage = React.lazy(() => import('../modules/sales/pages/SalesDashboardPage'));
const FinancialPositionPage = React.lazy(() => import('../modules/sales/pages/FinancialPositionPage'));
const InventoryValuationPage = React.lazy(() => import('../modules/sales/pages/InventoryValuationPage'));
const CashPositionPage = React.lazy(() => import('../modules/sales/pages/CashPositionPage'));
const SalesSummaryPage = React.lazy(() => import('../modules/sales/pages/SalesSummaryPage'));
const BusinessDocumentsPage = React.lazy(() => import('../modules/sales/pages/BusinessDocumentsPage'));
const SalesFinancialsTabsLayout = React.lazy(() => import('../modules/sales/SalesFinancialsTabsLayout').then(m => ({ default: m.SalesFinancialsTabsLayout })));

// Coordinator (my-residency) — modular replacement for CoordinatorResidencyDashboard
const ResidentCoordinatorLayout = React.lazy(() => import('../modules/residents/ResidentCoordinatorLayout'));
const CoordinatorReportsPage = React.lazy(() => import('../modules/residents/CoordinatorReportsPage'));
const CoordinatorMembersPage = React.lazy(() => import('../modules/residents/CoordinatorMembersPage'));
const CoordinatorEventsPage = React.lazy(() => import('../modules/residents/CoordinatorEventsPage'));

// Custom Dashboards
const NextGenFollowUp = React.lazy(() => import('./NextGenFollowUp'));
const NextGenTeam = React.lazy(() => import('./NextGenTeam'));
const NextGenReports = React.lazy(() => import('./NextGenReports'));
const StageCoordinatorDashboard = React.lazy(() => import('../modules/transportation/StageCoordinatorDashboard'));

// Dynamic/Generic Dashboard 
const GenericDeptDashboard = React.lazy(() => import('../modules/generic-dept/GenericDeptDashboard'));

// Map specific custom dashboards if needed, else fallback
const DepartmentDetail = React.lazy(() => import('./DepartmentDetail'));

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

    // ── Administration (d0) ────────────────────────────────────────────────────────
    if (dept?.slug === 'administration') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={[deptId]} />}>
                    <Route index element={<Navigate to="/administration" replace />} />
                    <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

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
                        <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
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
                    <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
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
                    <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
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
                    <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Transportation (d5) ──────────────────────────────────────────────────────
    if (dept?.slug === 'transportation') {
        const isStageCoordinator = currentUser?.role === 'Stage Coordinator' || (currentUser?.role === 'Coordinator' && !!currentUser?.stationId);
        const isVehicleCoordinator = currentUser?.role === 'Vehicle Coordinator';

        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['transportation']} />}>
                    <Route element={<TransportationLayout />}>
                        <Route index element={<RedirectWithParams to={isStageCoordinator ? "stage-dashboard" : "overview"} />} />
                        
                        {isStageCoordinator ? (
                            <Route path="stage-dashboard" element={<StageCoordinatorDashboard />} />
                        ) : isVehicleCoordinator ? (
                            <Route path="overview" element={<OverviewPage />} />
                        ) : (
                            <>
                                <Route path="overview"     element={<OverviewPage />} />
                                <Route path="coordinators" element={<CoordinatorsPage />} />
                                <Route path="stages"       element={<StagesPage />} />
                                <Route path="stage-dashboard" element={<StageCoordinatorDashboard />} />
                            </>
                        )}
                        
                        {/* Fallback for unauthorized navigation within TransportationLayout */}
                        <Route path="*" element={<Navigate to={isStageCoordinator ? "stage-dashboard" : "overview"} replace />} />
                    </Route>

                    {/* Generic Dept Dashboard outside of Layout */}
                    {!isStageCoordinator && !isVehicleCoordinator && (
                        <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                    )}
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
                        <Route path="queries"      element={<FollowUpQueriesPage />} />
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
                </Route>
            </Routes>
        );
    }

    // ── Schools (d7) ─────────────────────────────────────────────────────────────
    if (dept?.slug === 'schools') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['schools']} />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route element={<SchoolsLayout events={events} />}>
                        <Route element={<SchoolsTabsLayout />}>
                            <Route path="reports" element={<SchoolsReportsTab />} />
                            <Route path="events" element={<SchoolsEventsTab />} />
                        </Route>
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
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
                    <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
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
                    <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
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

    // ── Sales & Merchandise (d11) ────────────────────────────────────────────────
    if (dept?.slug === 'sales') {
        return (
            <Routes>
                <Route element={<ProtectedRoute allowedDepartments={['sales']} bypassRoles={['Sales Attendant', 'Administrator', 'Super Admin', 'HOD']} />}>
                    <Route element={<SalesLayout onOpenModal={onOpenModal} />}>
                        <Route index element={<RedirectWithParams to="sales-dashboard" />} />
                        <Route path="sales-dashboard" element={<SalesDashboardPage />} />
                        <Route path="pos" element={<POSPage />} />
                        <Route path="products" element={<ProductsPage />} />
                        <Route path="inventory" element={<InventoryPage />} />
                        <Route path="orders" element={<OrdersPage />} />
                        <Route path="customers" element={<CustomersPage />} />
                        <Route path="procurement" element={<ProcurementPage />} />
                        
                        <Route path="financials" element={<SalesFinancialsTabsLayout />}>
                            <Route index element={<RedirectWithParams to="sales-summary" />} />
                            <Route path="sales-summary" element={<SalesSummaryPage />} />
                            <Route path="financial-position" element={<FinancialPositionPage />} />
                            <Route path="inventory-valuation" element={<InventoryValuationPage />} />
                            <Route path="cash-position" element={<CashPositionPage />} />
                            <Route path="documents" element={<BusinessDocumentsPage />} />
                        </Route>
                    </Route>
                    <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
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

                <Route path="dashboard/*" element={<GenericDeptDashboard deptId={deptId} currentUser={currentUser} openModal={onOpenModal} onEditUser={onEditUser} />} />
            </Route>
        </Routes>
    );
};

export default DepartmentRouterProxy;
