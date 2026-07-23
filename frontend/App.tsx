import React, { useState } from 'react';
import { useNotification } from './components/ui/NotificationSystem';
import Sidebar from './components/Sidebar';
import SignIn from './components/SignIn';
import { ModalType, MinistryEvent, User } from './types';
import { DEPARTMENTS } from './constants/departments';
import { getDashboardForUser } from './utils';
import { UserStore } from './database/userStore';
import { EventStore } from './database/eventStore';
import { Bell, Search, Menu } from 'lucide-react';

import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import RoleRedirect from './components/RoleRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ProfileModal from './components/ProfileModal';
import { isTeamLeader } from './domain/rbac';

// ── Auth ──────────────────────────────────────────────────────────────────────
import { useAuth } from '@/context/AuthContext';

// ── Event Context ─────────────────────────────────────────────────────────────
import { useEvent } from './context/EventContext';

// ── Modules ───────────────────────────────────────────────────────────────────
import { NotificationDropdown } from './components/ui/NotificationDropdown';
import { PushPromptBanner } from './components/ui/PushPromptBanner';
import { InstallPWAPrompt } from './components/ui/InstallPWAPrompt';

// ─────────────────────────────────────────────────────────────────────────────

import { useBackgroundSync } from './hooks/useBackgroundSync';
import { SyncIndicator } from './components/SyncIndicator';
import { useUserManagement } from './hooks/useUserManagement';

// ── Lazy Loaded Routes ───────────────────────────────────────────────────────
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const DepartmentsView = React.lazy(() => import('./components/DepartmentsView'));
const EventsView = React.lazy(() => import('./components/EventsView'));
const ReportsView = React.lazy(() => import('./components/ReportsView'));
const GlobalSchedulesView = React.lazy(() => import('./components/GlobalSchedulesView'));
const AssetsTab = React.lazy(() => import('./components/AssetsTab').then(m => ({ default: m.AssetsTab })));
const TeamLeaderRequisitions = React.lazy(() => import('./components/TeamLeaderRequisitions'));
const ActionPanel = React.lazy(() => import('./components/ActionPanel'));
const MinistryAI = React.lazy(() => import('./components/MinistryAI'));
const PublicSoulEntry = React.lazy(() => import('./components/PublicSoulEntry'));
const DepartmentRouterProxy = React.lazy(() => import('./components/DepartmentRouterProxy'));
const WorkplanQueue = React.lazy(() => import('./components/WorkplanQueue'));
const RequisitionQueue = React.lazy(() => import('./components/RequisitionQueue'));
const AdminRequisitionQueue = React.lazy(() => import('./components/AdminRequisitionQueue'));
const AdministrationDashboard = React.lazy(() => import('./modules/administration/AdministrationDashboard'));
const TeamLeaderDashboard = React.lazy(() => import('./components/TeamLeaderDashboard'));
const SettingsLayout = React.lazy(() => import('./modules/settings/SettingsLayout'));
const SettingsMapPage = React.lazy(() => import('./modules/settings/SettingsMapPage'));
const SettingsManifestPage = React.lazy(() => import('./modules/settings/SettingsManifestPage'));

const RouteFallback = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div>
  </div>
);

const App: React.FC = () => {
  useBackgroundSync(); // Global injection of offline queue flusher
  const { showToast } = useNotification();
  const { user, isInitialLoading, login, googleLogin, logout, getDashboard } = useAuth();

  // ── UI state only ────────────────────────────────────────────────────────
  const [loginError, setLoginError]             = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen]       = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [modalType, setModalType]               = useState<ModalType>(ModalType.NONE);
  const [targetUser, setTargetUser]             = useState<User | null>(null);
  const { refreshUsersCounter, handleSaveUser, handleUpdateUser, handleDeleteUser } = useUserManagement();

  const navigate = useNavigate();
  const location = useLocation();

  // ── Auto-close sidebar on navigation ─────────────────────────────────────
  React.useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.key]);

  const isManualLogoutRef = React.useRef(false);

  // ── Force Logout Navigation Handler ──────────────────────────────────────
  React.useEffect(() => {
    const handleForceLogoutNavigation = () => {
      // Note: we don't clear the intended route here because we WANT to restore it 
      // after they log back in from a forced expiration!
      // The actual saving of the route and navigation happens in the render block below.
    };
    window.addEventListener('auth:force-logout', handleForceLogoutNavigation);
    return () => window.removeEventListener('auth:force-logout', handleForceLogoutNavigation);
  }, [navigate]);

  // ── Thin login wrappers (navigation only) ────────────────────────────────

  const navigatePostLogin = (authenticatedUser: User) => {
    const intendedRoute = sessionStorage.getItem('manifest_intended_route');
    if (intendedRoute) {
      sessionStorage.removeItem('manifest_intended_route');
      navigate(intendedRoute, { replace: true });
    } else {
      navigate(getDashboardForUser(authenticatedUser), { replace: true });
    }
  };

  const handleLogin = async (username: string, password: string) => {
    setLoginError(null);
    const result = await login(username, password);
    if (result.success && result.user) {
      navigatePostLogin(result.user);
    } else {
      setLoginError(result.error || 'Invalid credentials');
    }
  };

  const handleGoogleLogin = async (email: string, token: string) => {
    setLoginError(null);
    const result = await googleLogin(email, token);
    if (result.success && result.user) {
      navigatePostLogin(result.user);
    } else {
      setLoginError(result.error || 'Google login failed');
    }
  };

  const handleLogout = async () => {
    // Prevent accidental restoration of stale route after manual logout
    isManualLogoutRef.current = true;
    sessionStorage.removeItem('manifest_intended_route');
    await logout();
    navigate('/', { replace: true });
    setTimeout(() => { isManualLogoutRef.current = false; }, 200);
  };

  // ── Auth guard ────────────────────────────────────────────────────────────

  if (isInitialLoading) {
    // Forms routes get a plain spinner — no branding splash
    if (location.pathname.startsWith('/forms')) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#fff' }}>
          <svg
            style={{ width: 48, height: 48, animation: 'spin 0.8s linear infinite' }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle cx="12" cy="12" r="10" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeDasharray="40 20" />
          </svg>
        </div>
      );
    }
    return (
      <div className="splash-container">
        <img src="/MANIFEST.png" alt="Manifest MS Logo" className="splash-logo" />
      </div>
    );
  }

  if (!user) {
    if (location.pathname !== '/') {
      if (!isManualLogoutRef.current) {
        sessionStorage.setItem('manifest_intended_route', location.pathname + location.search);
      }
      return <Navigate to="/" replace />;
    }
    return <SignIn onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} error={loginError} />;
  }

  // ── Authenticated layout ──────────────────────────────────────────────────
  return (
      <div className="flex min-h-[100dvh] bg-ministry-black text-ministry-text font-sans selection:bg-ministry-neon selection:text-black">
        {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar — no longer receives currentUser prop */}
      <Sidebar
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-h-[100dvh] md:ml-64 transition-all duration-300 w-full outline-none">
        {/* Top header */}
        <header className="h-20 border-b border-gray-200 flex items-center justify-between px-4 md:px-8 bg-ministry-dark/95 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center w-full md:w-96">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden mr-4 p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative w-full group hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-ministry-orange transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 pl-10 pr-4 text-sm text-ministry-text focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all"
              />
            </div>
            <div className="md:hidden text-lg font-bold text-ministry-text truncate">
              {user.name}
            </div>
          </div>

          <div className="flex items-center space-x-4 md:space-x-6">
            <NotificationDropdown />

            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center space-x-3 border-l border-gray-200 pl-4 md:pl-6 hover:opacity-80 transition-opacity text-left cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-ministry-text">{user.name}</p>
                <p className="text-xs text-ministry-muted">
                  {user.role}
                  {(() => {
                    const n = DEPARTMENTS.find(d =>
                      d.id === user.departmentId || d.slug === user.departmentId || d.code === user.departmentId
                    )?.name;
                    return n ? ` • ${n}` : '';
                  })()}
                </p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-800 text-white flex items-center justify-center border-2 border-gray-300">
                <span className="font-bold text-xs md:text-sm">
                  {user.name.charAt(0)}{user.name.split(' ')[1]?.charAt(0)}
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* Routes */}
        <div className="flex-1 w-full relative">
          <ErrorBoundary moduleName="Application">
            <React.Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route index element={<RoleRedirect user={user} />} />

              {/* Admin dashboard */}
              <Route element={<ProtectedRoute allowedDepartments={['d0']} allowedRoles={['Super Admin', 'Administrator']} />}>
                <Route path="dashboard" element={<Dashboard openModal={setModalType} />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['TeamLeader']} />}>
                <Route path="team-dashboard" element={<TeamLeaderDashboard />} />
              </Route>

              {/* Administration — self-manages user list internally */}
              <Route element={<ProtectedRoute allowedDepartments={['d0']} allowedRoles={['Super Admin', 'Administrator', 'TeamLeader']} />}>
                <Route path="administration/*" element={
                  <React.Suspense fallback={<RouteFallback />}>
                    <AdministrationDashboard
                      openModal={setModalType}
                      onDeleteUser={handleDeleteUser}
                      onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }}
                      refreshTrigger={refreshUsersCounter}
                    />
                  </React.Suspense>
                } />
              </Route>

              {/* Public */}
              <Route path="public-soul-entry" element={<PublicSoulEntry />} />

              {/* Settings — self-manage user list internally */}
              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="manifest" replace />} />
                <Route path="map"      element={<SettingsMapPage      openModal={setModalType} onDeleteUser={handleDeleteUser} onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }} />} />
                <Route path="manifest" element={<SettingsManifestPage openModal={setModalType} onDeleteUser={handleDeleteUser} onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }} />} />
              </Route>
              <Route path="manifest-settings" element={<Navigate to="/settings/manifest" replace />} />

              {/* Departments — unified entry point */}
              <Route path="departments">
                <Route index element={<DepartmentsView currentUser={user} />} />
                <Route path=":deptId/*" element={
                  <DepartmentRouterProxy
                    onOpenModal={setModalType}
                    onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }}
                  />
                } />
              </Route>

              {/* Backward-compat redirects */}
              <Route path="departments/d0/*" element={<Navigate to="/departments/0b685c69-edb6-44b9-8f21-1a11878b6d7b" replace />} />
              <Route path="departments/d1/*" element={<Navigate to="/departments/81b8b740-6663-4179-bcfb-e3dc7524d36c" replace />} />
              <Route path="departments/d2/*" element={<Navigate to="/departments/a9aff0dc-1a78-4c00-ad29-4531942670d0" replace />} />
              <Route path="departments/d3/*" element={<Navigate to="/departments/65808f94-cf1c-4e0f-b7f0-d3ac2b49d20a" replace />} />
              <Route path="departments/d4/*" element={<Navigate to="/departments/e35f6789-1862-4c31-8b13-96d59463d257" replace />} />
              <Route path="departments/d5/*" element={<Navigate to="/departments/4630e48a-f97e-48fd-a901-864b591c282f" replace />} />
              <Route path="departments/d6/*" element={<Navigate to="/departments/e680342f-72c7-4d10-b7cb-631725afe770" replace />} />
              <Route path="departments/d7/*" element={<Navigate to="/departments/4d99940e-58ec-40ba-92bd-4a65651bf23a" replace />} />
              <Route path="departments/d8/*" element={<Navigate to="/departments/f1a0d749-d681-4150-9764-aecfeac8b0ca" replace />} />
              <Route path="departments/d9/*" element={<Navigate to="/departments/b2c1d3e4-f5a6-7890-bcde-1234567890ab" replace />} />
              <Route path="departments/d10/*" element={<Navigate to="/departments/c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" replace />} />

              <Route path="registration/*"  element={<Navigate to="/departments/81b8b740-6663-4179-bcfb-e3dc7524d36c" replace />} />
              <Route path="next-gen/*"      element={<Navigate to="/departments/a9aff0dc-1a78-4c00-ad29-4531942670d0" replace />} />
              <Route path="parking/*"       element={<Navigate to="/departments/65808f94-cf1c-4e0f-b7f0-d3ac2b49d20a" replace />} />
              <Route path="finance/*"       element={<Navigate to="/departments/e35f6789-1862-4c31-8b13-96d59463d257" replace />} />
              <Route path="transportation/*"element={<Navigate to="/departments/4630e48a-f97e-48fd-a901-864b591c282f" replace />} />
              <Route path="follow-up/*"     element={<Navigate to="/departments/e680342f-72c7-4d10-b7cb-631725afe770" replace />} />
              <Route path="schools/*"       element={<Navigate to="/departments/4d99940e-58ec-40ba-92bd-4a65651bf23a" replace />} />
              <Route path="healing/*"       element={<Navigate to="/departments/f1a0d749-d681-4150-9764-aecfeac8b0ca" replace />} />
              <Route path="campus/*"        element={<Navigate to="/departments/b2c1d3e4-f5a6-7890-bcde-1234567890ab" replace />} />
              <Route path="residents/*"     element={<Navigate to="/departments/c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" replace />} />
              <Route path="stage-dashboard" element={<Navigate to="/departments/4630e48a-f97e-48fd-a901-864b591c282f/stage-dashboard" replace />} />
              <Route path="sales/*"         element={<Navigate to="/departments/afc0240b-0faf-48ec-a1d8-ad2f193eb891" replace />} />

              {/* Global Scopes */}
              <Route element={<ProtectedRoute allowedRoles={['Administrator', 'Super Admin', 'TeamLeader', 'Finance', 'Dept Finance', 'Head of Dept', 'HOD', 'Dept Admin']} />}>
                   <Route path="approvals/workplans" element={<WorkplanQueue systemRole={user.role} />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['TeamLeader']} />}>
                   <Route path="approvals/requisitions" element={<TeamLeaderRequisitions currentUser={user} />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Administrator', 'Super Admin']} />}>
                   <Route path="approvals/adhoc-requisitions" element={<AdminRequisitionQueue currentUser={user} />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Dept Finance', 'Finance', 'Head of Dept', 'HOD', 'Dept Admin']} allowedDepartments={['d4', 'e35f6789-1862-4c31-8b13-96d59463d257']} />}>
                   <Route path="finance/processing" element={<RequisitionQueue systemRole={user.role} />} />
              </Route>

              <Route path="events"      element={<EventsView />} />
              <Route path="reports"     element={<ReportsView currentUser={user} isGlobal={true} />} />
              <Route path="schedules"   element={<GlobalSchedulesView />} />



              <Route path="assets" element={
                <div className="p-4 md:p-8">
                  <h1 className="text-3xl font-bold text-ministry-text mb-6">Assets Management</h1>
                  <AssetsTab currentUser={user} />
                </div>
              } />

              <Route path="*" element={
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-700 mb-2">Page Not Found</h2>
                    <p>The requested page: {location.pathname}</p>
                  </div>
                </div>
              } />
            </Routes>
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {/* Modals */}
      <React.Suspense fallback={null}>
        {modalType !== ModalType.NONE && modalType !== ModalType.AI_INSIGHTS && (
          <ActionPanel
            modalType={modalType}
            closeModal={() => setModalType(ModalType.NONE)}
            onSaveUser={handleSaveUser}
            onUpdateUser={handleUpdateUser}
            currentUser={user}
            targetUser={targetUser}
          />
        )}
        {modalType === ModalType.AI_INSIGHTS && <MinistryAI onClose={() => setModalType(ModalType.NONE)} />}
      </React.Suspense>
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentUser={user} />
      <SyncIndicator />
      <PushPromptBanner />
      <InstallPWAPrompt />
    </div>
  );
};

export default App;
