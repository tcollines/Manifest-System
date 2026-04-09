import React, { useState, useEffect } from 'react';
import { useNotification } from './components/ui/NotificationSystem';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DepartmentsView from './components/DepartmentsView';
import EventsView from './components/EventsView';
import ReportsView from './components/ReportsView';
import SignIn from './components/SignIn';
import SetupAccount from './components/SetupAccount';
import { AssetsTab } from './components/AssetsTab';
import { ModalType, MinistryEvent, User } from './types';
import { DEPARTMENTS } from './constants';
import { EventStore } from './database/eventStore';
import { UserStore } from './database/userStore';
import { Bell, Search, Menu } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import TeamLeaderRequisitions from './components/TeamLeaderRequisitions';
import RequisitionsView from './components/RequisitionsView';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import RoleRedirect from './components/RoleRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import ProfileModal from './components/ProfileModal';
import ActionPanel from './components/ActionPanel';
import MinistryAI from './components/MinistryAI';
import PublicSoulEntry from './components/PublicSoulEntry';
import DepartmentRouterProxy from './components/DepartmentRouterProxy';

// ── Auth ──────────────────────────────────────────────────────────────────────
import { useAuth } from './context/AuthContext';

// ── Modules ───────────────────────────────────────────────────────────────────
import AdministrationDashboard from './modules/administration/AdministrationDashboard';
import TeamLeaderDashboard from './components/TeamLeaderDashboard';

// ── Settings ──────────────────────────────────────────────────────────────────
import SettingsLayout from './modules/settings/SettingsLayout';
import SettingsMapPage from './modules/settings/SettingsMapPage';
import SettingsManifestPage from './modules/settings/SettingsManifestPage';

// ─────────────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const { showToast } = useNotification();
  const { user, isLoading, login, googleLogin, logout, getDashboard } = useAuth();

  // ── UI state (not auth state) ────────────────────────────────────────────
  const [loginError, setLoginError]         = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen]   = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [modalType, setModalType]           = useState<ModalType>(ModalType.NONE);
  const [targetUser, setTargetUser]         = useState<User | null>(null);
  const [allUsers, setAllUsers]             = useState<User[]>([]);

  // ── Events state (owned by App for realtime distribution) ────────────────
  const [events, setEvents] = useState<MinistryEvent[]>([]);

  const navigate  = useNavigate();
  const location  = useLocation();

  // ── Initial events fetch (once user is available) ─────────────────────────
  useEffect(() => {
    if (!user) return;
    EventStore.getAll({ limit: 50 }).then(res => {
      if (res.status === 'success' && res.data) setEvents(res.data);
    });
  }, [user?.id]); // re-fetch only when user identity actually changes

  // ── Ministry events realtime subscription ────────────────────────────────
  // NOTE: This is the ONLY realtime listener that remains in App.tsx.
  // Auth realtime listeners live exclusively in AuthContext.
  useEffect(() => {
    if (!user) return; // don't subscribe before auth is ready

    const subscription = supabase
      .channel('app:ministry_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ministry_events' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        setEvents(prev => {
          let next: MinistryEvent[];
          if (eventType === 'INSERT') {
            if (prev.some(e => e.id === newRecord.id)) return prev;
            next = [newRecord as MinistryEvent, ...prev];
          } else if (eventType === 'UPDATE') {
            next = prev.map(e => e.id === newRecord.id ? (newRecord as MinistryEvent) : e);
          } else if (eventType === 'DELETE') {
            next = prev.filter(e => e.id !== oldRecord.id);
          } else {
            return prev;
          }
          return next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [user?.id]);

  // ── Thin login wrappers (navigation only — auth state managed by AuthContext) ──

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

  // ── Event data handlers ──────────────────────────────────────────────────

  const refreshData = async () => {
    try {
      const res = await EventStore.getAll({ limit: 50 });
      if (res.status === 'success' && res.data) setEvents(res.data);
    } catch (e) {
      console.error('[App] refreshData failed:', e);
    }
  };

  const handleSaveEvent = async (newEvent: MinistryEvent) => {
    try {
      setEvents(prev => [newEvent, ...prev]);
      await EventStore.add(newEvent);
      await refreshData();
      showToast(`${newEvent.type} created successfully!`, 'success');
    } catch (error: any) {
      console.error('Failed to save event:', error);
      showToast(`Failed to save event: ${error.message || 'Unknown error'}`, 'error');
      refreshData();
    }
  };

  // ── User CRUD handlers ───────────────────────────────────────────────────

  const handleSaveUser = async (newUser: User) => {
    try {
      const usersResp = await UserStore.getAll();
      const users = usersResp.status === 'success' && usersResp.data ? usersResp.data : [];
      if (users.some(u => u.username?.toLowerCase() === newUser.username?.toLowerCase())) {
        if (newUser.username) {
          alert(`Error: The username "${newUser.username}" is already taken. Please choose another.`);
          return;
        }
      }
      if (newUser.email && users.some(u => u.email?.toLowerCase() === newUser.email?.toLowerCase())) {
        throw new Error(`The email "${newUser.email}" is already registered.`);
      }
      const response = await UserStore.add(newUser);
      if (response.status === 'success' && response.data) {
        setAllUsers(response.data);
      } else {
        throw new Error(response.status === 'error' ? response.message : 'Failed to add user');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to add user');
      throw e;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const response = await UserStore.remove(userId);
    if (response.status === 'success' && response.data) setAllUsers(response.data);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const response = await UserStore.update(updatedUser);
      if (response.status === 'success' && response.data) {
        setAllUsers(response.data);
      } else {
        throw new Error(response.status === 'error' ? response.message : 'Failed to update user');
      }
      showToast('User updated successfully!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update user', 'error');
      throw e;
    }
  };

  // ── Auth guard (reads ONLY from AuthContext) ──────────────────────────────

  // Phase 1+2 loading: wait for AuthContext to fully settle before rendering
  if (isLoading) {
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

  // Unauthenticated: show sign-in screen
  if (!user) {
    return <SignIn onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} error={loginError} />;
  }

  // Account not yet set up
  if (location.pathname === '/setup-account') {
    return <SetupAccount currentUser={user} onComplete={handleSetupComplete} onLogout={handleLogout} />;
  }

  // ── Authenticated layout ─────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-ministry-black text-ministry-text font-sans selection:bg-ministry-neon selection:text-black">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        currentUser={user}
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
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Bell className="text-gray-500" size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-ministry-orange rounded-full border-2 border-white" />
            </button>

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

            {/* Administration */}
            <Route element={<ProtectedRoute allowedDepartments={['d0']} allowedRoles={['Super Admin', 'Administrator', 'TeamLeader']} />}>
              <Route path="administration/*" element={
                <AdministrationDashboard
                  users={allUsers}
                  openModal={setModalType}
                  onDeleteUser={handleDeleteUser}
                  onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }}
                  currentUser={user}
                />
              } />
            </Route>

            {/* Public */}
            <Route path="public-soul-entry" element={<PublicSoulEntry />} />

            {/* Settings */}
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="manifest" replace />} />
              <Route path="map"      element={<SettingsMapPage      users={allUsers} openModal={setModalType} onDeleteUser={handleDeleteUser} currentUser={user} onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }} />} />
              <Route path="manifest" element={<SettingsManifestPage users={allUsers} openModal={setModalType} onDeleteUser={handleDeleteUser} currentUser={user} onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }} />} />
            </Route>
            <Route path="manifest-settings" element={<Navigate to="/settings/manifest" replace />} />

            {/* Departments — unified entry point */}
            <Route path="departments">
              <Route index element={<DepartmentsView currentUser={user} />} />
              <Route path=":deptId/*" element={
                <DepartmentRouterProxy
                  events={events}
                  onOpenModal={setModalType}
                  onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }}
                  refreshParentData={refreshData}
                />
              } />
            </Route>

            {/* Backward-compat redirects */}
            <Route path="registration/*"  element={<Navigate to="/departments/d1" replace />} />
            <Route path="next-gen/*"      element={<Navigate to="/departments/d2" replace />} />
            <Route path="parking/*"       element={<Navigate to="/departments/d3" replace />} />
            <Route path="finance/*"       element={<Navigate to="/departments/d4" replace />} />
            <Route path="transportation/*"element={<Navigate to="/departments/d5" replace />} />
            <Route path="follow-up/*"     element={<Navigate to="/departments/d6" replace />} />
            <Route path="schools/*"       element={<Navigate to="/departments/d7" replace />} />
            <Route path="healing/*"       element={<Navigate to="/departments/d8" replace />} />
            <Route path="campus/*"        element={<Navigate to="/departments/d9" replace />} />

            <Route path="events"      element={<EventsView />} />
            <Route path="reports"     element={<ReportsView currentUser={user} />} />

            <Route path="requisitions" element={
              user?.role === 'TeamLeader'
                ? <TeamLeaderRequisitions currentUser={user} />
                : <RequisitionsView currentUser={user} />
            } />

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
    </div>
  );
};

export default App;
