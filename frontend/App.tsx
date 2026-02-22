import React, { useState, useEffect } from 'react';
import { useNotification } from './components/ui/NotificationSystem';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DepartmentsView from './components/DepartmentsView';
import DepartmentDetail from './components/DepartmentDetail';
import DepartmentRequests from './components/DepartmentRequests';
import EventsView from './components/EventsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import RegistrationDashboard from './components/RegistrationDashboard';
import HealingDashboard from './components/HealingDashboard';
import NextGenDashboard from './components/NextGenDashboard';
import NextGenFollowUp from './components/NextGenFollowUp';
import NextGenTeam from './components/NextGenTeam';
import NextGenReports from './components/NextGenReports';
import TransportationDashboard from './components/TransportationDashboard';
import FinanceDashboard from './components/FinanceDashboard';
import FollowUpDashboard from './components/FollowUpDashboard';
import ParkingDashboard from './components/ParkingDashboard';
import TeamLeaderDashboard from './components/TeamLeaderDashboard';
import ActionPanel from './components/ActionPanel';
import MinistryAI from './components/MinistryAI';
import SetupAccount from './components/SetupAccount';
import SignIn from './components/SignIn';
import RequisitionsView from './components/RequisitionsView';
import PublicSoulEntry from './components/PublicSoulEntry';
import { AssetsTab } from './components/AssetsTab';
import { ModalType, MinistryEvent, User } from './types';
import { DEPARTMENTS } from './constants';
import { UserStore } from './database/userStore';
import { EventStore } from './database/eventStore';
import { Bell, Search, Menu } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import TeamLeaderRequisitions from './components/TeamLeaderRequisitions';
import { SchoolsDashboard } from './components/SchoolsDashboard';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { getDashboardForUser } from './utils';
import RoleRedirect from './components/RoleRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import StageCoordinatorDashboard from './components/StageCoordinatorDashboard';

const App: React.FC = () => {
  const { showToast } = useNotification();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [modalType, setModalType] = useState<ModalType>(ModalType.NONE);
  const [events, setEvents] = useState<MinistryEvent[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Helper functions defined before effects to avoid hoisting issues logic-wise
  const refreshData = async () => {
    try {
      // FIX: Use Promise.allSettled to prevent partial failures from crashing the app
      const results = await Promise.allSettled([
        // UserStore.getAll(), // REMOVED: Too heavy for initial load. Fetched on demand in Settings.
        EventStore.getAll({ limit: 50 })
      ]);

      // Handle Events
      const eventResult = results[0]; // Was index 1, now index 0 since UserStore is removed
      if (eventResult.status === 'fulfilled' && eventResult.value.status === 'success') {
        setEvents(eventResult.value.data || []);
      } else {
        console.warn("Initial event fetch failed or returned partial data");
      }

      // Setup All Users as empty initially - specific views will fetch what they need
      // or we can fetch a small subset if absolutely necessary.
      // For now, adhere to stability plan: Remove getAll() from critical path.

    } catch (e) {
      console.error("Critical error during initial data load", e);
    }
  };

  // 1. Initial Session Check (Standardize logic)
  useEffect(() => {
    const init = async () => {
      // Restore Session from Supabase natively
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        // Fetch or sync user profile
        const profile = await UserStore.getByEmail(session.user.email || '');
        if (profile) {
          setCurrentUser(profile);
          refreshData(); // Only fetch data if we have a session
        }
      }
    };
    init();
  }, []);

  // Auth & Realtime Data Listener
  useEffect(() => {
    // Note: refreshData() removed from here, handled by init() and onAuthStateChange

    // Set up Realtime Subscription
    const subscription = supabase
      .channel('public:db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        // Optional: Refresh only current user or specific cached users if we had a cache.
        // For now, do nothing or just check if *current* user handle changed.
        if (currentUser) {
          UserStore.get(currentUser.id).then(res => {
            if (res.status === 'success' && res.data) {
              setCurrentUser(res.data);
              UserStore.saveSession(res.data);
            }
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ministry_events' }, (payload) => {
        refreshData();
      })
      .subscribe();

    // Supabase Auth Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) {
        // Fetch specific user profile to ensure we get it even if RLS restricts 'getAll'
        const matchingUser = await UserStore.getByEmail(session.user.email);

        if (matchingUser) {
          setCurrentUser(matchingUser);
          UserStore.saveSession(matchingUser);

          // Check if new user needs to setup account
          if (!matchingUser.username) {
            navigate('/setup-account');
          } else {
            // If we are strictly at / or /login, redirect. Else stay.
            if (location.pathname === '/' || location.pathname === '/login') {
              const target = getDashboardForUser(matchingUser);
              navigate(target);
            }
          }
          setLoginError(null);
        } else {
          console.warn("User authenticated but no profile found for:", session.user.email);
          if (location.pathname === '/setup-account') {
            // Handle setup flow
            const tempUser: User = { /* ... placeholder ... */
              id: session.user.id,
              email: session.user.email || '',
              username: '',
              name: 'New User',
              role: 'Member',
              departmentId: '',
              contact: '',
              password: ''
            };
            setCurrentUser(tempUser);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        navigate('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await UserStore.login(username, password);

      if (response.status === 'success' && response.data) {
        const user = response.data;
        setCurrentUser(user);
        UserStore.saveSession(user);

        if (!user.username) {
          navigate('/setup-account');
          return;
        }

        const targetTab = getDashboardForUser(user);
        navigate(targetTab);
        setLoginError(null);
      } else if (response.status === 'error') {
        setLoginError(response.message);
      } else {
        setLoginError('Invalid username or password.');
      }
    } catch (error) {
      console.error("Login Error:", error);
      setLoginError('An error occurred during login.');
    }
  };

  const handleGoogleLogin = async (email: string, token: string) => {
    try {
      console.log(`[AUTH] Setting up Supabase session with Google Identity Token for ${email}`);
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: token,
      });

      if (authError || !authData.session) {
        console.error("Supabase ID Token Auth Failed:", authError);
        setLoginError('Authentication failed. Please try again.');
        return;
      }

      console.log(`[AUTH] Session established. Fetching Manifest profile for ${email}`);
      const user = await UserStore.getByEmail(email);

      if (user) {
        setCurrentUser(user);
        UserStore.saveSession(user);

        if (!user.username) {
          const generatedUsername = user.email ? user.email.split('@')[0] : `user_${crypto.randomUUID()}`;
          const updatedUser: User = { ...user, username: generatedUsername, status: 'Active' };

          try {
            await UserStore.update(updatedUser);
            setCurrentUser(updatedUser);
            UserStore.saveSession(updatedUser);

            const targetTab = getDashboardForUser(updatedUser);
            navigate(targetTab);
            setLoginError(null);
            return;
          } catch (err) {
            console.error("Failed to auto-update username", err);
            navigate('/setup-account');
            return;
          }
        }

        const targetTab = getDashboardForUser(user);
        navigate(targetTab);
        setLoginError(null);
      } else {
        setLoginError('No account found with this Google email.');
      }
    } catch (e) {
      console.error("Google Login Error", e);
      setLoginError('Google login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    // Safety Force Logout if Supabase hangs
    const forceLogout = setTimeout(() => {
      console.warn("Sign out hanging? Forcing local state clear.");
      setCurrentUser(null);
      setLoginError(null);
      setIsSidebarOpen(false);
      navigate('/');
    }, 2000);

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn("Ignored local sign out warning:", err);
    }

    clearTimeout(forceLogout);
    setCurrentUser(null);
    setLoginError(null);
    setIsSidebarOpen(false);
    navigate('/');
  };

  const handleSaveEvent = async (newEvent: MinistryEvent) => {
    try {
      setEvents(prev => [newEvent, ...prev]);
      await EventStore.add(newEvent);
      const updatedEventsResp = await EventStore.getAll({ limit: 50 });
      if (updatedEventsResp.status === 'success' && updatedEventsResp.data) {
        setEvents(updatedEventsResp.data);
      }
      showToast(`${newEvent.type} created successfully!`, 'success');
    } catch (error: any) {
      console.error("Failed to save event:", error);
      showToast(`Failed to save event: ${error.message || 'Unknown error'}`, 'error');
      refreshData();
    }
  };

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
        // handle error appropriately
        throw new Error(`The email "${newUser.email}" is already registered.`);
      }

      const response = await UserStore.add(newUser);
      if (response.status === 'success' && response.data) {
        setAllUsers(response.data);
      } else {
        const errorMsg = response.status === 'error' ? response.message : 'Failed to add user';
        throw new Error(errorMsg);
      }
    } catch (e: any) {
      alert(e.message || "Failed to add user");
      throw e;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const response = await UserStore.remove(userId);
    if (response.status === 'success' && response.data) {
      setAllUsers(response.data);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const response = await UserStore.update(updatedUser);
      if (response.status === 'success' && response.data) {
        setAllUsers(response.data);
      } else {
        const errorMsg = response.status === 'error' ? response.message : 'Failed to update user';
        throw new Error(errorMsg);
      }
      showToast("User updated successfully!", 'success');
    } catch (e: any) {
      showToast(e.message || "Failed to update user", 'error');
      throw e;
    }
  };

  const handleSetupComplete = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    UserStore.saveSession(updatedUser);
    showToast("Account setup complete!", 'success');
    const targetTab = getDashboardForUser(updatedUser);
    navigate(targetTab);
  };

  // Auth Guard
  if (!currentUser) {
    if (location.pathname === '/setup-account') {
      // Let Root handle it? Or we can render it here but we don't have user.
      // If user is null but path is setup-account, it implies we might be waiting for auth
      // or user manually navigated there. 
      // We'll let existing logic hold: without currentUser, show SignIn unless explicit public route
      // But Root handles public routes. If we are here, it means we hit * which maps to App.
      return <SignIn onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} error={loginError} />;
    }
    return <SignIn onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} error={loginError} />;
  }

  if (location.pathname === '/setup-account' || !currentUser.username) {
    return <SetupAccount currentUser={currentUser} onComplete={handleSetupComplete} onLogout={handleLogout} />;
  }

  return (
    <div className="flex min-h-screen bg-ministry-black text-ministry-text font-sans selection:bg-ministry-neon selection:text-black">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <Sidebar
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-h-screen md:ml-64 transition-all duration-300 w-full">
        {/* Top Header */}
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
              {currentUser.name}
            </div>
          </div>

          <div className="flex items-center space-x-4 md:space-x-6">
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Bell className="text-gray-500" size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-ministry-orange rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center space-x-3 border-l border-gray-200 pl-4 md:pl-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-ministry-text">{currentUser.name}</p>
                <p className="text-xs text-ministry-muted">{currentUser.role} {currentUser.departmentId ? `• ${DEPARTMENTS.find(d => d.id === currentUser.departmentId)?.name}` : ''}</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-800 text-white flex items-center justify-center border-2 border-gray-300">
                <span className="font-bold text-xs md:text-sm">{currentUser.name.charAt(0)}{currentUser.name.split(' ')[1]?.charAt(0)}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content via Router */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <Routes>
            <Route index element={<RoleRedirect user={currentUser} />} />

            {/* Main Admin Dashboard - Protected */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d0']} allowedRoles={['Super Admin', 'Administrator']} />}>
              <Route path="dashboard" element={<Dashboard openModal={setModalType} />} />
            </Route>

            <Route element={<ProtectedRoute currentUser={currentUser} allowedRoles={['TeamLeader']} />}>
              <Route path="team-dashboard" element={<TeamLeaderDashboard />} />
            </Route>

            {/* Public or Shared Routes */}
            <Route path="public-soul-entry" element={<PublicSoulEntry />} />

            {/* SETTINGS: Protect? Usually accessible but maybe restricted features inside. Leaving open for now as SettingsView handles some internal logic, or wrap it if needed. */}
            <Route path="settings" element={
              <SettingsView
                users={allUsers}
                openModal={setModalType}
                onDeleteUser={handleDeleteUser}
                currentUser={currentUser}
                onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }}
              />
            } />

            <Route path="manifest-settings" element={
              <SettingsView
                users={allUsers}
                openModal={setModalType}
                onDeleteUser={handleDeleteUser}
                currentUser={currentUser}
                initialTab="manifest"
                onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }}
              />
            } />

            {/* --- DEPARTMENT SPECIFIC ROUTES --- */}

            {/* Registration (d1) */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d1']} bypassRoles={['Logistics']} />}>
              <Route path="registration" element={<RegistrationDashboard events={events} currentUser={currentUser} onOpenModal={setModalType} refreshParentData={refreshData} />} />
            </Route>

            {/* Next Gen (d2) */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d2']} />}>
              <Route path="next-gen" element={<NextGenDashboard events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
              <Route path="next-gen-follow-up" element={<NextGenFollowUp currentUser={currentUser} events={events} />} />
              <Route path="next-gen-team" element={<NextGenTeam currentUser={currentUser} />} />
              <Route path="next-gen-reports" element={<NextGenReports />} />
            </Route>

            {/* Parking (d3) */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d3']} />}>
              <Route path="parking" element={<ParkingDashboard events={events} onOpenModal={setModalType} />} />
            </Route>

            {/* Finance (d4) */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d4']} />}>
              <Route path="finance" element={<FinanceDashboard currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
            </Route>

            {/* Healing (d8) */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d8']} />}>
              <Route path="healing" element={<HealingDashboard currentUser={currentUser} />} />
            </Route>

            {/* Transportation (d5) */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d5']} />}>
              <Route path="transportation" element={<TransportationDashboard currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
              <Route path="stage-dashboard" element={<StageCoordinatorDashboard currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
            </Route>

            {/* Follow-Up (d6) */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d6']} />}>
              <Route path="follow-up" element={<FollowUpDashboard onOpenModal={setModalType} currentUser={currentUser} />} />
            </Route>

            {/* Schools (d7) */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d7']} />}>
              <Route path="schools" element={<SchoolsDashboard currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
            </Route>

            {/* General Routes/Shared Logic */}
            <Route path="departments">
              <Route index element={<DepartmentsView currentUser={currentUser} />} />
              <Route path=":departmentId" element={<DepartmentDetail />}>
                <Route path="requests" element={<DepartmentRequests />} />
              </Route>
            </Route>

            <Route path="events" element={<EventsView />} />
            <Route path="reports" element={<ReportsView currentUser={currentUser} />} />

            <Route path="requisitions" element={
              currentUser?.role === 'TeamLeader'
                ? <TeamLeaderRequisitions currentUser={currentUser} />
                : <RequisitionsView currentUser={currentUser} />
            } />

            <Route path="assets" element={<div className="p-4 md:p-8"><h1 className="text-3xl font-bold text-ministry-text mb-6">Assets Management</h1><AssetsTab currentUser={currentUser} /></div>} />

            <Route path="*" element={
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-700 mb-2">Page Not Found</h2>
                  <p>The requested page check: {location.pathname}</p>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </main>

      {/* Modals */}
      <ActionPanel
        modalType={modalType}
        closeModal={() => setModalType(ModalType.NONE)}
        onSave={handleSaveEvent}
        onSaveUser={handleSaveUser}
        onUpdateUser={handleUpdateUser}
        currentUser={currentUser}
        targetUser={targetUser}
      />
      {modalType === ModalType.AI_INSIGHTS && <MinistryAI onClose={() => setModalType(ModalType.NONE)} />}
    </div>
  );
};

export default App;
