import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DepartmentStore } from '../../database/departmentStore';
import { getAccessibleTabs, DeptTabId } from '../../domain/deptAccessRules';
import { Department, User, ModalType } from '../../types';
import { DeptRole } from '../../shared/enums';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { LayoutDashboard, Users, FileText, ClipboardList, Package, Calendar, DollarSign, BarChart2 } from 'lucide-react';

// Tab pages
import OverviewTab       from './tabs/OverviewTab';
import TeamTab           from './tabs/TeamTab';
import RequisitionsTab   from './tabs/RequisitionsTab';
import WorkplansTab      from './tabs/WorkplansTab';
import AssetsTab         from './tabs/AssetsTab';
import ScheduleTab       from './tabs/ScheduleTab';
import FinancesTab       from './tabs/FinancesTab';
import ReportsTab        from './tabs/ReportsTab';

// ─── Tab Map ──────────────────────────────────────────────────────────────────

const ALL_TABS: { id: DeptTabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview',     label: 'Overview',         icon: LayoutDashboard },
    { id: 'team',         label: 'Team',             icon: Users },
    { id: 'requisitions', label: 'Requisitions',     icon: FileText },
    { id: 'workplans',    label: 'Workplans',        icon: ClipboardList },
    { id: 'assets',       label: 'Assets',           icon: Package },
    { id: 'schedule',     label: 'Schedule',         icon: Calendar },
    { id: 'finances',     label: 'Finances',         icon: DollarSign },
    { id: 'reports',      label: 'Reports',          icon: BarChart2 },
];

const VALID_TABS = ALL_TABS.map(t => t.id);

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardProps {
    openModal?: (type: ModalType) => void;
    onEditUser?: (user: User) => void;
    currentUser?: User | null;
    deptId?: string;
}

const GenericDeptDashboard: React.FC<DashboardProps> = ({ openModal, onEditUser, currentUser, deptId: propDeptId }) => {
    const params                        = useParams<{ deptId: string }>();
    const deptId                        = propDeptId || params.deptId;
    const { user } = useAuth();
    const navigate                      = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [department, setDepartment]   = useState<Department | null>(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);

    // Derive activeTab DIRECTLY from URL — no state sync needed, no loop
    const tabParam  = searchParams.get('tab') as DeptTabId | null;
    const activeTab: DeptTabId = (tabParam && VALID_TABS.includes(tabParam)) ? tabParam : 'overview';

    const deptRole   = null as DeptRole | null; // kept for future per-dept role checks
    const systemRole = user?.role as any ?? null;

    // Map system/app role to dept-scoped role for tab access control
    const effectiveDeptRole: DeptRole | null = (() => {
        const r = user?.role;
        if (r === 'Super Admin' || r === 'Administrator' || r === 'TeamLeader' || r === 'Team Leader') return 'HOD';
        if (r === 'Head of Dept' || r === 'HOD' || r === 'Dept Admin')   return 'HOD';
        // 'Dept Admin' is mapped to 'HOD' above
        if (r === 'Dept Finance')                   return 'Dept Finance';
        if (r === 'Member')                         return 'Member';
        return null;
    })();

    // ── Fetch department — with AbortController to cancel in-flight requests
    //    on fast re-mounts (prevents request flooding if the route changes rapidly).
    const abortRef = useRef<AbortController | null>(null);
    useEffect(() => {
        if (!user || !deptId) return;   // Only fetch when both are available

        // Cancel any previous in-flight request for this component instance
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);
        DepartmentStore.getById(deptId).then(res => {
            if (controller.signal.aborted) return;  // Ignore stale response
            if (res.status === 'success') {
                setDepartment(res.data);
            } else {
                // Fallback to static DEPARTMENTS list
                import('../../constants/departments').then(({ DEPARTMENTS }) => {
                    if (controller.signal.aborted) return;
                    const fallback = DEPARTMENTS.find(d => d.id === deptId || d.uuid === deptId || d.slug === deptId || d.code === deptId);
                    if (fallback) {
                        setDepartment(fallback);
                    } else {
                        setError(res.message ?? 'Failed to load department');
                    }
                    setLoading(false);
                }).catch(() => {
                    setError(res.message ?? 'Failed to load department');
                    setLoading(false);
                });
                return;
            }
            setLoading(false);
        }).catch(err => {
            if (controller.signal.aborted) return;
            import('../../constants/departments').then(({ DEPARTMENTS }) => {
                if (controller.signal.aborted) return;
                const fallback = DEPARTMENTS.find(d => d.id === deptId || d.uuid === deptId || d.slug === deptId || d.code === deptId);
                if (fallback) {
                    setDepartment(fallback);
                } else {
                    setError('Failed to fetch department');
                }
                setLoading(false);
            });
        });

        return () => { controller.abort(); };  // Cleanup on unmount
    }, [user, deptId]);

    // ── Tab click — just update URL, activeTab derives from it automatically ─
    const handleTabChange = (tab: DeptTabId) => {
        setSearchParams({ tab }, { replace: true });
    };

    // ── Pure render guards — NO navigation here.
    //    ProtectedRoute (in App.tsx routing) handles unauthenticated access.
    //    GenericDeptDashboard's job is only to render content.
    if (!user) {
        return <LoadingSpinner message="Loading…" />;
    }
    if (!deptId) {
        return <LoadingSpinner message="Loading…" />;
    }

    if (loading) {
        return (
            <div className="flex flex-col bg-gray-50 min-h-screen">
                <div className="bg-white border-b border-gray-100 px-6 py-5 md:px-8">
                    <div className="max-w-screen-xl mx-auto flex items-center gap-3">
                        {['Super Admin', 'Administrator'].includes(user?.role ?? '') && (
                            <>
                                <button onClick={() => navigate('/departments')} className="text-gray-400 hover:text-gray-600 text-sm">← Departments</button>
                                <span className="text-gray-300">/</span>
                            </>
                        )}
                        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                </div>
                <div className="flex-1 flex justify-center items-center mt-20">
                    <LoadingSpinner message="Loading department details…" />
                </div>
            </div>
        );
    }

    if (error || !department) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-500">{error ?? 'Department not found'}</p>
                    <button
                        onClick={() => navigate('/departments')}
                        className="mt-4 text-ministry-orange underline text-sm"
                    >
                        Back to Departments
                    </button>
                </div>
            </div>
        );
    }

    // Admins/TeamLeader get the in-page tab bar for OTHER departments; but for their OWN department, they navigate via sidebar to avoid redundancy.
    const isAdminOrTL = ['Super Admin', 'Administrator', 'TeamLeader'].includes(user?.role ?? '');
    const showInlineTabBar = isAdminOrTL && deptId !== user?.departmentId;

    // ── Tab visibility ───────────────────────────────────────────────────────
    const accessibleTabs = getAccessibleTabs(effectiveDeptRole, systemRole);
    const visibleTabs    = ALL_TABS.filter(t => accessibleTabs.includes(t.id));

    // Clamp to first accessible if current tab isn't accessible
    const safeActiveTab: DeptTabId = accessibleTabs.includes(activeTab)
        ? activeTab
        : (accessibleTabs[0] as DeptTabId);

    // ── Tab content ──────────────────────────────────────────────────────────
    const renderTab = () => {
        const props = { department, user, deptRole: effectiveDeptRole, systemRole };
        switch (safeActiveTab) {
            case 'overview':     return <OverviewTab     {...props} />;
            case 'team':         return <TeamTab         {...props} openModal={openModal} onEditUser={onEditUser} />;
            case 'requisitions': return <RequisitionsTab {...props} />;
            case 'workplans':    return <WorkplansTab    {...props} />;
            case 'assets':       return <AssetsTab       {...props} />;
            case 'schedule':     return <ScheduleTab     {...props} />;

            case 'finances':     return <FinancesTab     {...props} />;
            case 'reports':      return <ReportsTab      {...props} />;
            default:             return null;
        }
    };

    // Limit bottom nav to max 4 tabs for mobile readability (excluding team)
    const bottomNavTabs = visibleTabs.filter(t => t.id !== 'team').slice(0, 4);

    return (
        <div className="flex flex-col bg-gray-50 min-h-screen">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 md:px-8 md:py-5">
                <div className="max-w-screen-xl mx-auto flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {['Super Admin', 'Administrator'].includes(user?.role ?? '') && (
                            <>
                                <button
                                    onClick={() => navigate('/departments')}
                                    className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
                                    aria-label="Back to departments"
                                >
                                    ← Departments
                                </button>
                                <span className="text-gray-300">/</span>
                            </>
                        )}
                        <h1 className="text-xl font-bold text-gray-900">{department.name}</h1>
                    </div>
                    {department.headName && (
                        <p className="text-sm text-gray-500 hidden md:block">
                            Head: <span className="font-medium text-gray-700">{department.headName}</span>
                        </p>
                    )}
                </div>

                {/* Desktop Tab Bar — admins/TL only */}
                {showInlineTabBar && (
                    <div className="max-w-screen-xl mx-auto mt-4 hidden md:block">
                        <div className="flex gap-1 overflow-x-auto">
                            {visibleTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id as DeptTabId)}
                                    className={[
                                        'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                                        safeActiveTab === tab.id
                                            ? 'bg-ministry-orange/10 text-ministry-orange'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                                    ].join(' ')}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 px-4 py-4 md:p-8 max-w-screen-xl mx-auto w-full mb-20 md:mb-0">
                <ErrorBoundary moduleName={`${department.name} — ${safeActiveTab}`}>
                    {renderTab()}
                </ErrorBoundary>
            </div>

            {/* Mobile Floating Bottom Nav */}
            <nav className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm">
                <div className="flex items-center justify-between gap-1 bg-white/75 backdrop-blur-2xl rounded-full p-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100">
                    {bottomNavTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = safeActiveTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id as DeptTabId)}
                                className={[
                                    'flex flex-col items-center justify-center w-full py-2 rounded-full transition-all duration-300 relative overflow-hidden',
                                    isActive
                                        ? 'text-ministry-neon'
                                        : 'text-gray-500 hover:text-gray-900',
                                ].join(' ')}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-black rounded-full scale-100 animate-in zoom-in duration-300" />
                                )}
                                <div className="relative z-10 flex flex-col items-center gap-1">
                                    <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'text-ministry-neon scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className={`text-[10px] tracking-wide transition-all duration-300 ${isActive ? 'font-bold text-ministry-neon' : 'font-medium'}`}>{tab.label}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default GenericDeptDashboard;
