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
// [PHASE B] Registration module — URL-driven nested routing
import RegistrationLayout from './modules/registration/RegistrationLayout';
import CheckInPage from './modules/registration/CheckInPage';
import EventsPage from './modules/registration/EventsPage';
import DatabasePage from './modules/registration/DatabasePage';
// [PHASE C] Finance module — URL-driven nested routing
import FinanceLayout from './modules/finance/FinanceLayout';
import IncomePage from './modules/finance/IncomePage';
import ExpensesPage from './modules/finance/ExpensesPage';
import FinanceRequisitionsPage from './modules/finance/FinanceRequisitionsPage';
import FleetPage from './modules/finance/FleetPage';
// [PHASE D] Transportation module
import TransportationLayout from './modules/transportation/TransportationLayout';
import OverviewPage from './modules/transportation/OverviewPage';
import CoordinatorsPage from './modules/transportation/CoordinatorsPage';
import StagesPage from './modules/transportation/StagesPage';
// [PHASE D] FollowUp module
import FollowUpLayout from './modules/follow-up/FollowUpLayout';
import FollowUpServicesPage from './modules/follow-up/FollowUpServicesPage';
import FollowUpEventsPage from './modules/follow-up/FollowUpEventsPage';
import FollowUpDatabasePage from './modules/follow-up/FollowUpDatabasePage';
import FollowUpFirstTimersPage from './modules/follow-up/FollowUpFirstTimersPage';
import FollowUpMembersPage from './modules/follow-up/FollowUpMembersPage';
import FollowUpAnalysisPage from './modules/follow-up/FollowUpAnalysisPage';
import HealingDashboard from './components/HealingDashboard';
import NextGenDashboard from './components/NextGenDashboard';
import NextGenFollowUp from './components/NextGenFollowUp';
import NextGenReports from './components/NextGenReports';
import NextGenTeam from './components/NextGenTeam';
// [PHASE E] NextGen
import NextGenLayout from './modules/next-gen/NextGenLayout';
import NextGenCheckInPage from './modules/next-gen/NextGenCheckInPage';
import NextGenCheckOutPage from './modules/next-gen/NextGenCheckOutPage';
import NextGenDatabasePage from './modules/next-gen/NextGenDatabasePage';
import NextGenSoulsPage from './modules/next-gen/NextGenSoulsPage';
// [PHASE E] Settings
import SettingsLayout from './modules/settings/SettingsLayout';
import SettingsUsersPage from './modules/settings/SettingsUsersPage';
import SettingsMapPage from './modules/settings/SettingsMapPage';
import SettingsProfilePage from './modules/settings/SettingsProfilePage';
import SettingsManifestPage from './modules/settings/SettingsManifestPage';
// [PHASE E] Residents
import ResidentLayout from './modules/residents/ResidentLayout';
import ResidentOverviewPage from './modules/residents/ResidentOverviewPage';
import ResidentResidencesPage from './modules/residents/ResidentResidencesPage';
import ResidentReportsPage from './modules/residents/ResidentReportsPage';
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
import CampusDashboard from './components/CampusDashboard';
import CampusMinistryEvents from './components/CampusMinistryEvents';
import CampusFinanceDashboard from './components/CampusFinanceDashboard';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { getDashboardForUser } from './utils';
import RoleRedirect from './components/RoleRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import StageCoordinatorDashboard from './components/StageCoordinatorDashboard';
import ResidentDashboard from './components/ResidentDashboard';
import CoordinatorResidencyDashboard from './components/CoordinatorResidencyDashboard';

// [PHASE F] Parking
import ParkingLayout from './modules/parking/ParkingLayout';
import ParkingCheckInPage from './modules/parking/ParkingCheckinPage';
import ParkingDatabasePage from './modules/parking/ParkingDatabasePage';

// [PHASE F] Schools
import SchoolsLayout from './modules/schools/SchoolsLayout';
import SchoolsReportsPage from './modules/schools/SchoolsReportsPage';
import SchoolsEventsPage from './modules/schools/SchoolsEventsPage';

// [PHASE F] Campus
import CampusLayout from './modules/campus/CampusLayout';
import CampusFamiliesPage from './modules/campus/CampusFamiliesPage';
import CampusEvangelismPage from './modules/campus/CampusEvangelismPage';
import CampusVacistsPage from './modules/campus/CampusVacistsPage';
import CampusAlumniPage from './modules/campus/CampusAlumniPage';

// [PHASE F] Healing
import HealingLayout from './modules/healing/HealingLayout';
import HealingOverviewPage from './modules/healing/HealingOverviewPage';
import HealingReportsPage from './modules/healing/HealingReportsPage';
import HealingSoulsPage from './modules/healing/HealingSoulsPage';
import HealingTestimoniesPage from './modules/healing/HealingTestimoniesPage';
import HealingNewPage from './modules/healing/HealingNewPage';

const App: React.FC = () => {
  const { showToast } = useNotification();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [modalType, setModalType] = useState<ModalType>(ModalType.NONE);
  const [events, setEvents] = useState<MinistryEvent[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [isInitializingAuth, setIsInitializingAuth] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // [FIX 1-A] Live location ref — always reflects current pathname inside stale closures
  const locationRef = React.useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // [FIX 1-B] Single-navigation guard — prevents token refresh events from re-triggering navigate()
  const hasNavigatedRef = React.useRef(false);

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
      try {
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
      } finally {
        setIsInitializingAuth(false);
      }
    };
    init();
  }, []);

  // Auth & Realtime Data Listener
  useEffect(() => {
    // Set up Realtime Subscription
    const subscription = supabase
      .channel('public:db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
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
        const { eventType, new: newRecord, old: oldRecord } = payload;
        setEvents(prev => {
          let next;
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

    // [FIX 1] Supabase Auth Listener — stale closure eliminated via locationRef + hasNavigatedRef
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        // [FIX 1-B, Adj 2] Authenticate realtime only when a real token exists
        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
        }

        // [Adj 6] Temporary debug log — remove after confirming fix is stable
        console.log('[NAV]', {
          source: 'authListener',
          event,
          hasToken: !!session?.access_token,
          path: locationRef.current.pathname,  // live ref, not stale closure
          hasNavigated: hasNavigatedRef.current
        });

        if (
          event === 'SIGNED_IN' &&
          session?.access_token &&          // [Adj 2] guard: real session, not ghost event
          session?.user?.email &&
          !hasNavigatedRef.current           // [Fix 1-B] guard: navigate only on real login, not token refresh
        ) {
          console.log(`[AUTH] SIGNED_IN detected for ${session.user.email}. Fetching profile...`);
          const matchingUser = await UserStore.getByEmail(session.user.email, session.access_token);

          // [GUARD 2] Null guard — prevents partial state navigation if profile fetch returns nothing
          if (!matchingUser) {
            console.warn(`[AUTH] Profile returned null for ${session.user.email}. Skipping navigation.`);
            return;
          }

          if (matchingUser.name) {
            setCurrentUser(matchingUser);
            UserStore.saveSession(matchingUser);
            refreshData();

            // [FIX 1-A] Use locationRef.current — always the live pathname, never frozen at mount
            const authPaths = ['/', '/login', '/setup-account'];
            if (authPaths.includes(locationRef.current.pathname)) {
              const target = getDashboardForUser(matchingUser);
              // [GUARD 4] Safe navigation fallback — skip if target is somehow undefined
              if (!target) return;
              hasNavigatedRef.current = true;  // [Fix 1-B] lock: prevent any further auto-navigation
              navigate(target, { replace: true });
            }
            setLoginError(null);
          } else {
            console.warn("User auto-created but not pre-invited:", session.user.email);
            await supabase.auth.signOut();
            setLoginError('Your Google email is not registered. Please ask an Administrator to add you.');
            navigate('/');
          }
        }
      } catch (e: any) {
        console.error("[AUTH] Error in onAuthStateChange profile fetch:", e);
        // [FIX 1-A] Use locationRef.current here too
        if (locationRef.current.pathname === '/' || locationRef.current.pathname === '/login') {
          setLoginError(`Profile error: ${e.message || 'Unauthorized'}`);
        }
      }

      // [Adj 5] SIGNED_OUT: only clear React state. handleLogout() is the single navigation authority.
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        // navigate('/') intentionally REMOVED — handleLogout() owns routing on logout
      }
    });

    // [FIX 6] auth:force-logout — fired by api.ts on Google SSO 401 instead of window.location.href
    const onForceLogout = () => handleLogout();
    window.addEventListener('auth:force-logout', onForceLogout);

    // [Adj 3] Explicit cleanup — prevents double-listener in React StrictMode dev remounts
    return () => {
      authListener?.subscription?.unsubscribe();
      supabase.removeChannel(subscription);
      window.removeEventListener('auth:force-logout', onForceLogout);
    };
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
      // [GUARD 1] Reset nav guard — allows re-login within same session to navigate correctly
      hasNavigatedRef.current = false;

      const response = await UserStore.login(username, password);

      if (response.status === 'success' && response.data) {
        const user = response.data;
        setCurrentUser(user);
        UserStore.saveSession(user);
        refreshData();

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
      // [GUARD 1] Reset nav guard — allows re-login within same session to navigate correctly
      hasNavigatedRef.current = false;

      console.log(`[AUTH] Setting up Supabase session with Google Identity Token for ${email}`);

      // [FIX 6] Collect then delete — safe iteration (no mutation during loop)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('ministry_user_session'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // Bypass Supabase Auth for Google
      localStorage.setItem('google_sso_token', token);

      console.log(`[AUTH] Valid Google token stored. Fetching Manifest profile for ${email}`);

      let user = null;
      let lastErr = null;
      try {
        user = await UserStore.getByEmail(email, token);
      } catch (e: any) {
        lastErr = e.message || 'Unknown profile error';
      }

      if (user && user.name) {
        setCurrentUser(user);
        UserStore.saveSession(user);
        refreshData();

        const targetTab = getDashboardForUser(user);
        navigate(targetTab);
        setLoginError(null);
      } else if (user && !user.name) {
        await supabase.auth.signOut();
        setLoginError('Your Google email is not registered in Manifest. Please ask an Administrator to add you.');
      } else {
        console.error("[AUTH ERROR] Profile fetch failed for", email, "Error:", lastErr);
        setLoginError(`Account profile not found for ${email}. Error: ${lastErr || 'No profile row'}`);
      }
    } catch (e: any) {
      console.error("Google Login Catch Error:", e);
      setLoginError(`Google login failed: ${e.message || 'Unknown error'}`);
    }
  };

  // [GUARD 3] Idempotency flag — prevents double-logout from duplicate auth:force-logout events
  const isLoggingOutRef = React.useRef(false);

  const handleLogout = async () => {
    // [GUARD 3] Block duplicate concurrent logout triggers
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    // [Fix 1-B] Reset navigation guard so next login can navigate again
    hasNavigatedRef.current = false;

    // Safety Force Logout if Supabase hangs
    const forceLogout = setTimeout(() => {
      console.warn("Sign out hanging? Forcing local state clear.");
      setCurrentUser(null);
      setLoginError(null);
      setIsSidebarOpen(false);
      isLoggingOutRef.current = false;
      navigate('/');
    }, 2000);

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn("Ignored local sign out warning:", err);
    }

    // [FIX 6] Complete storage cleanup — all session and UI state keys cleared on logout
    localStorage.removeItem('google_sso_token');
    // finance_active_tab removed — URL is now source of truth (Phase C)
    // registration_active_tab removed — URL is now source of truth (Phase B)
    // transportation_active_tab removed — URL is now source of truth (Phase D)
    UserStore.clearSession();

    clearTimeout(forceLogout);
    setCurrentUser(null);
    setLoginError(null);
    setIsSidebarOpen(false);
    isLoggingOutRef.current = false;  // reset so future logout works
    navigate('/');  // [Adj 5] handleLogout() is the single navigation authority on logout
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

  // Auth Initialization Guard (prevents login flicker)
  if (isInitializingAuth) {
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

  if (location.pathname === '/setup-account') {
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

            {/* SETTINGS (Phase E Nested URL Routes) */}
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<SettingsUsersPage users={allUsers} openModal={setModalType} onDeleteUser={handleDeleteUser} currentUser={currentUser} onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }} />} />
              <Route path="map" element={<SettingsMapPage users={allUsers} openModal={setModalType} onDeleteUser={handleDeleteUser} currentUser={currentUser} onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }} />} />
              <Route path="profile" element={<SettingsProfilePage users={allUsers} openModal={setModalType} onDeleteUser={handleDeleteUser} currentUser={currentUser} onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }} />} />
              <Route path="manifest" element={<SettingsManifestPage users={allUsers} openModal={setModalType} onDeleteUser={handleDeleteUser} currentUser={currentUser} onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }} />} />
            </Route>

            <Route path="manifest-settings" element={<Navigate to="/settings/manifest" replace />} />

            {/* --- DEPARTMENT SPECIFIC ROUTES --- */}

            {/* Registration (d1) — [PHASE B] Nested URL-driven routes */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d1']} bypassRoles={['Logistics']} />}>
              <Route
                path="registration"
                element={<RegistrationLayout currentUser={currentUser} />}
              >
                {/* Index — redirect to default tab based on role */}
                <Route
                  index
                  element={<Navigate to={currentUser.role === 'Logistics' ? 'events' : 'check-in'} replace />}
                />
                <Route
                  path="check-in"
                  element={
                    <CheckInPage
                      events={events}
                      currentUser={currentUser}
                      onOpenModal={setModalType}
                      refreshParentData={refreshData}
                    />
                  }
                />
                <Route
                  path="events"
                  element={
                    <EventsPage
                      events={events}
                      currentUser={currentUser}
                      onOpenModal={setModalType}
                      refreshParentData={refreshData}
                    />
                  }
                />
                <Route
                  path="database"
                  element={
                    <DatabasePage
                      events={events}
                      currentUser={currentUser}
                      onOpenModal={setModalType}
                      refreshParentData={refreshData}
                    />
                  }
                />
              </Route>
            </Route>

            {/* Next Gen (d2) — [PHASE E] Nested URL-driven routes */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d2']} />}>
              <Route path="next-gen" element={<NextGenLayout />}>
                <Route index element={<Navigate to="checkin" replace />} />
                <Route path="checkin"  element={<NextGenCheckInPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="checkout" element={<NextGenCheckOutPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="database" element={<NextGenDatabasePage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="souls"    element={<NextGenSoulsPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
              </Route>
              <Route path="next-gen-follow-up" element={<NextGenFollowUp currentUser={currentUser} events={events} />} />
              <Route path="next-gen-team" element={<NextGenTeam currentUser={currentUser} />} />
              <Route path="next-gen-reports" element={<NextGenReports />} />
            </Route>

            {/* Parking (d3) — [PHASE F] Nested URL-driven routes */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d3']} />}>
              <Route path="parking" element={<ParkingLayout />}>
                <Route index element={<Navigate to="checkin" replace />} />
                <Route path="checkin" element={<ParkingCheckInPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
                <Route path="database" element={<ParkingDatabasePage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
              </Route>
            </Route>

            {/* Finance (d4) — [PHASE C] Nested URL-driven routes */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d4']} />}>
              <Route path="finance" element={<FinanceLayout currentUser={currentUser} />}>
                <Route index element={<Navigate to="income" replace />} />
                <Route path="income"       element={<IncomePage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="expenses"     element={<ExpensesPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="requisitions" element={<FinanceRequisitionsPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="fleet"        element={<FleetPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
              </Route>
            </Route>

            {/* Healing (d8) — [PHASE F] Nested URL-driven routes */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d8']} />}>
              <Route path="healing" element={<HealingLayout />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<HealingOverviewPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
                <Route path="reports" element={<HealingReportsPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
                <Route path="souls" element={<HealingSoulsPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
                <Route path="testimonies" element={<HealingTestimoniesPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
                <Route path="new" element={<HealingNewPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
              </Route>
            </Route>

            {/* Transportation (d5) — [PHASE D] Nested URL-driven routes */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['4630e48a-f97e-48fd-a901-864b591c282f', 'd5']} />}>
              <Route path="transportation" element={<TransportationLayout />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview"     element={<OverviewPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="coordinators" element={<CoordinatorsPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="stages"       element={<StagesPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
              </Route>
              <Route path="stage-dashboard" element={<StageCoordinatorDashboard currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
            </Route>

            {/* Follow-Up (d6) — [PHASE D] Nested URL-driven routes */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d6']} />}>
              <Route path="follow-up" element={<FollowUpLayout />}>
                <Route index element={<Navigate to="services" replace />} />
                <Route path="services"     element={<FollowUpServicesPage currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="events"       element={<FollowUpEventsPage currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="database"     element={<FollowUpDatabasePage currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="first-timers" element={<FollowUpFirstTimersPage currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="members"      element={<FollowUpMembersPage currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="analysis"     element={<FollowUpAnalysisPage currentUser={currentUser} onOpenModal={setModalType} />} />
              </Route>
            </Route>

            {/* Schools (d7) — [PHASE F] Nested URL-driven routes */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d7']} />}>
              <Route path="schools" element={<SchoolsLayout />}>
                <Route index element={<Navigate to="reports" replace />} />
                <Route path="reports" element={<SchoolsReportsPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
                <Route path="events" element={<SchoolsEventsPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
              </Route>
            </Route>

            {/* Residents (d10) — [PHASE E] Nested URL-driven routes */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedRoles={['Administrator', 'Super Admin']} />}>
              <Route path="residents" element={<ResidentLayout />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview"   element={<ResidentOverviewPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="residences" element={<ResidentResidencesPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
                <Route path="reports"    element={<ResidentReportsPage events={events} currentUser={currentUser} onOpenModal={setModalType} />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute currentUser={currentUser} allowedRoles={['Resident Coordinator']} />}>
              <Route path="my-residency" element={<CoordinatorResidencyDashboard currentUser={currentUser} />} />
            </Route>

            {/* Campus and Institutions (d9) — [PHASE F] Nested URL-driven routes */}
            <Route element={<ProtectedRoute currentUser={currentUser} allowedDepartments={['d9']} />}>
              <Route path="campus" element={<CampusLayout />}>
                <Route index element={<Navigate to="families" replace />} />
                <Route path="families" element={<CampusFamiliesPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
                <Route path="evangelism" element={<CampusEvangelismPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
                <Route path="vacists" element={<CampusVacistsPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
                <Route path="alumni" element={<CampusAlumniPage currentUser={currentUser} events={events} onOpenModal={setModalType} />} />
                <Route path="finance" element={<CampusFinanceDashboard currentUser={currentUser} />} />
              </Route>
              <Route path="campus/events" element={<CampusMinistryEvents events={events} />} />
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
