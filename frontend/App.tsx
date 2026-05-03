import React, { useState } from 'react';
import { useNotification } from './components/ui/NotificationSystem';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DepartmentsView from './components/DepartmentsView';
import EventsView from './components/EventsView';
import ReportsView from './components/ReportsView';
import GlobalSchedulesView from './components/GlobalSchedulesView';
import SignIn from './components/SignIn';
import SetupAccount from './components/SetupAccount';
import { AssetsTab } from './components/AssetsTab';
import { ModalType, MinistryEvent, User } from './types';
import { DEPARTMENTS } from './constants';
import { UserStore } from './database/userStore';
import { EventStore } from './database/eventStore';
import { Bell, Search, Menu } from 'lucide-react';
import TeamLeaderRequisitions from './components/TeamLeaderRequisitions';

import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import RoleRedirect from './components/RoleRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import ProfileModal from './components/ProfileModal';
import ActionPanel from './components/ActionPanel';
import MinistryAI from './components/MinistryAI';
import PublicSoulEntry from './components/PublicSoulEntry';
import DepartmentRouterProxy from './components/DepartmentRouterProxy';
import { isTeamLeader } from './domain/rbac';

import WorkplanQueue from './components/WorkplanQueue';
import RequisitionQueue from './components/RequisitionQueue';
import AdminRequisitionQueue from './components/AdminRequisitionQueue';

// ── Auth ──────────────────────────────────────────────────────────────────────
import { useAuth } from './context/AuthContext';

// ── Event Context ─────────────────────────────────────────────────────────────
import { useEvent } from './context/EventContext';

// ── Modules ───────────────────────────────────────────────────────────────────
import AdministrationDashboard from './modules/administration/AdministrationDashboard';
import TeamLeaderDashboard from './components/TeamLeaderDashboard';
import { NotificationDropdown } from './components/ui/NotificationDropdown';

// ── Settings ──────────────────────────────────────────────────────────────────
import SettingsLayout from './modules/settings/SettingsLayout';
import SettingsMapPage from './modules/settings/SettingsMapPage';
import SettingsManifestPage from './modules/settings/SettingsManifestPage';

// ─────────────────────────────────────────────────────────────────────────────

import { useBackgroundSync } from './hooks/useBackgroundSync';
import { SyncIndicator } from './components/SyncIndicator';

const App: React.FC = () => {
  useBackgroundSync(); // Global injection of offline queue flusher
  const { showToast } = useNotification();
  const { user, isInitialLoading, login, googleLogin, logout, getDashboard } = useAuth();
  const { addEvent, refreshEvents } = useEvent();

  // ── UI state only ────────────────────────────────────────────────────────
  const [loginError, setLoginError]             = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen]       = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [modalType, setModalType]               = useState<ModalType>(ModalType.NONE);
  const [targetUser, setTargetUser]             = useState<User | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // ── Thin login wrappers (navigation only) ────────────────────────────────

  const handleLogin = async (username: string, password: string) => {
    setLoginError(null);
    const result = await login(username, password);
    if (result.success) {
      navigate(getDashboard(), { replace: true });
    } else {
      setLoginError(result.error || 'Invalid credentials');
    }
  };

  const handleGoogleLogin = async (email: string, token: string) => {
    setLoginError(null);
    const result = await googleLogin(email, token);
    if (result.success) {
      navigate(getDashboard(), { replace: true });
    } else {
      setLoginError(result.error || 'Google login failed');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const handleSetupComplete = (updatedUser: User) => {
    UserStore.saveSession(updatedUser);
    showToast('Account setup complete!', 'success');
    navigate(getDashboard(), { replace: true });
  };

  // ── Event handlers (thin wrappers; state lives in EventContext) ───────────

  const handleSaveEvent = async (newEvent: MinistryEvent) => {
    try {
      addEvent(newEvent);             // optimistic update in context
      await EventStore.add(newEvent);
      await refreshEvents();          // reconcile from DB
      showToast(`${newEvent.type} created successfully!`, 'success');
    } catch (error: any) {
      console.error('Failed to save event:', error);
      showToast(`Failed to save event: ${error.message || 'Unknown error'}`, 'error');
      refreshEvents();
    }
  };

  // ── User CRUD handlers (used only by ActionPanel/Settings/Administration) ─
  // These stay in App.tsx minimally because ActionPanel is a global modal
  // that can be opened from any page. Moving state to AdministrationDashboard
  // would require lifting it back up for Settings pages.
  // A dedicated UserManagementContext is the P1 follow-up for this.

  const handleSaveUser = async (newUser: User) => {
    try {
      const usersResp = await UserStore.getAll();
      const users = usersResp.status === 'success' && usersResp.data ? usersResp.data : [];
      if (users.some(u => u.username?.toLowerCase() === newUser.username?.toLowerCase())) {
        if (newUser.username) {
          showToast(`Error: The username "${newUser.username}" is already taken.`, 'error');
          return;
        }
      }
      if (newUser.email && users.some(u => u.email?.toLowerCase() === newUser.email?.toLowerCase())) {
        throw new Error(`The email "${newUser.email}" is already registered.`);
      }
      const response = await UserStore.add(newUser);
      if (response.status !== 'success') {
        throw new Error(response.status === 'error' ? response.message : 'Failed to add user');
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to add user', 'error');
      throw e;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    await UserStore.remove(userId);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const response = await UserStore.update(updatedUser);
      if (response.status !== 'success') {
        throw new Error(response.status === 'error' ? response.message : 'Failed to update user');
      }
      showToast('User updated successfully!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update user', 'error');
      throw e;
    }
  };

  // ── Auth guard ────────────────────────────────────────────────────────────

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center fade-in">
        <div className="flex flex-col items-center animate-pulse">
          <div className="w-16 h-16 bg-ministry-orange rounded-2xl shadow-xl flex items-center justify-center transform rotate-12 mb-6">
            <span className="text-white font-bold text-3xl -rotate-12">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manifest</h1>
          <p className="text-sm text-gray-400 font-medium mt-2">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignIn onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} error={loginError} />;
  }

  if (location.pathname === '/setup-account') {
    return <SetupAccount currentUser={user} onComplete={handleSetupComplete} onLogout={handleLogout} />;
  }

  // ── Authenticated layout ──────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-ministry-black text-ministry-text font-sans selection:bg-ministry-neon selection:text-black">
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

      <main className="flex-1 flex flex-col min-h-screen md:ml-64 transition-all duration-300 w-full">
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
        <div className="flex-1 overflow-y-auto scroll-smooth">
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
                <AdministrationDashboard
                  openModal={setModalType}
                  onDeleteUser={handleDeleteUser}
                  onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }}
                />
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
        </div>
      </main>

      {/* Modals */}
      {modalType !== ModalType.NONE && (
        <ActionPanel
          modalType={modalType}
          closeModal={() => setModalType(ModalType.NONE)}
          onSave={handleSaveEvent}
          onSaveUser={handleSaveUser}
          onUpdateUser={handleUpdateUser}
          currentUser={user}
          targetUser={targetUser}
        />
      )}
      {modalType === ModalType.AI_INSIGHTS && <MinistryAI onClose={() => setModalType(ModalType.NONE)} />}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentUser={user} />
      <SyncIndicator />
    </div>
  );
};

export default App;
