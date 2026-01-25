import React, { useState, useEffect } from 'react';
import { useNotification } from './components/ui/NotificationSystem';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DepartmentsView from './components/DepartmentsView';
import EventsView from './components/EventsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import RegistrationDashboard from './components/RegistrationDashboard';
import NextGenDashboard from './components/NextGenDashboard';
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
import { MOCK_EVENTS, DEPARTMENTS } from './constants';
import { UserStore } from './database/userStore';
import { EventStore } from './database/eventStore';
import { Bell, Search, Menu } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import TeamLeaderRequisitions from './components/TeamLeaderRequisitions';
import { SchoolsDashboard } from './components/SchoolsDashboard';

const App: React.FC = () => {
  const { showToast } = useNotification();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ministry_active_tab') || 'dashboard');
  const [modalType, setModalType] = useState<ModalType>(ModalType.NONE);
  const [events, setEvents] = useState<MinistryEvent[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);

  // Helper functions defined before effects to avoid hoisting issues logic-wise
  const refreshData = async () => {
    try {
      const [users, dbEvents] = await Promise.all([
        UserStore.getAll(),
        EventStore.getAll()
      ]);
      setAllUsers(users);
      if (dbEvents && dbEvents.length > 0) {
        setEvents(dbEvents);
      }
    } catch (e) {
      console.error("Failed to load initial data", e);
    }
  };

  // Helper to determine default dashboard based on role/department
  const getDashboardForUser = (user: User): string => {
    if (user.role === 'Super Admin' || user.role === 'Administrator') return 'dashboard';

    // Role-specific overrides (BEFORE Department Check)
    if (user.role === 'Logistics') return 'registration'; // Logistics view is within RegistrationDashboard
    if (user.role === 'Coordinator') return 'transportation';

    // Map Department ID to Dashboard View
    switch (user.departmentId) {
      case 'd1': return 'registration';
      case 'd2': return 'next-gen';
      case 'd3': return 'parking';
      case 'd4': return 'finance';
      case 'd5': return 'transportation';
      case 'd6': return 'follow-up';
      case 'd7': return 'schools';
      default: return 'team-dashboard'; // Fallback for members/leaders without specific department dashboard
    }
  };

  const handleNavigate = (view: string) => {
    setActiveTab(view);
    localStorage.setItem('ministry_active_tab', view);
    setIsSidebarOpen(false);
  };

  // Initialize Users and Events from Store and check for session
  useEffect(() => {
    // Check for persisted session
    const persistedUser = UserStore.getSession();
    if (persistedUser) {
      setCurrentUser(persistedUser);

      // Enforce Role-Based Routing on Load
      // If user is NOT admin, prevent them from seeing the main dashboard
      const allowedDashboard = getDashboardForUser(persistedUser);
      const currentTab = localStorage.getItem('ministry_active_tab') || 'dashboard';

      if (allowedDashboard !== 'dashboard' && currentTab === 'dashboard') {
        setActiveTab(allowedDashboard);
      }
    }

    // Check if redirected to setup-account
    if (window.location.pathname === '/setup-account') {
      setActiveTab('setup-account');
    }

    // Check for Public Soul Collection Link
    if (window.location.pathname.startsWith('/collect-souls/')) {
      setActiveTab('public-soul-entry');
    }

    // Check for errors in the URL hash (e.g. invalid/expired link)
    const hash = window.location.hash;
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1)); // remove #
      const errorDescription = params.get('error_description');
      if (errorDescription) {
        setLoginError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
      }
    }
  }, []);

  // Auth & Realtime Data Listener
  useEffect(() => {
    refreshData();

    // Set up Realtime Subscription
    const subscription = supabase
      .channel('public:db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {

        refreshData();
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
            setActiveTab('setup-account');
          } else {
            // Redirect logic based on Role using specific helper
            const target = getDashboardForUser(matchingUser);
            setActiveTab(target);
          }
          setLoginError(null);
        } else {
          console.warn("User authenticated but no profile found for:", session.user.email);
          // FALLBACK: If user is authenticated via Magic Link but DB profile is missing/RLS blocked
          // We FORCE them to Setup Account so they can at least try to recover/create profile.
          if (window.location.pathname === '/setup-account') {
            const tempUser: User = {
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
            setActiveTab('setup-account');
          } else {
            // If not on setup page, treat as logged out or potentially show an error/loading
            // For now, we won't set currentUser, so SignIn will show.
            console.warn("User authenticated but no profile found. Not on setup page, causing SignIn to render.");
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        UserStore.clearSession();
        setActiveTab('dashboard');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
      const user = await UserStore.login(username, password);
      if (user) {
        setCurrentUser(user);
        UserStore.saveSession(user);

        // Check if new user needs setup (Invite flow or incomplete profile)
        if (!user.username) {
          setActiveTab('setup-account');
          return;
        }

        // Route to appropriate dashboard based on Role/Department
        const targetTab = getDashboardForUser(user);
        setActiveTab(targetTab);
        localStorage.setItem('ministry_active_tab', targetTab);
        setLoginError(null);
      } else {
        setLoginError('Invalid credentials. Please try again.');
      }
    } catch (error) {
      console.error("Login Error:", error);
      setLoginError('An error occurred during login.');
    }
  };

  const handleLogout = async () => {
    // 1. Clear Supabase Auth Session (Critical for preventing auto-relogin of same user)
    await supabase.auth.signOut();

    // 2. Clear Local App Session and View States
    UserStore.clearSession();
    localStorage.removeItem('ministry_active_tab');
    localStorage.removeItem('registration_view_mode'); // Fix for persisting view state across users
    localStorage.removeItem('registration_active_tab');

    setCurrentUser(null);
    setActiveTab('dashboard');
    setLoginError(null);
    setIsSidebarOpen(false);
  };

  // Auto-Logout on Inactivity
  useEffect(() => {
    if (!currentUser) return;

    let timer: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 600 * 1000; // 10 minute

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {

        handleLogout();
      }, INACTIVITY_LIMIT);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    // Initial start
    resetTimer();

    // Attach listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      clearTimeout(timer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser]); // Re-attach when user login status changes

  const handleSaveEvent = async (newEvent: MinistryEvent) => {
    try {
      // Optimistic update
      setEvents(prev => [newEvent, ...prev]);

      // Save to DB
      await EventStore.add(newEvent);

      // Refresh from DB to ensure sync
      const updatedEvents = await EventStore.getAll();
      setEvents(updatedEvents);

      showToast(`${newEvent.type} created successfully!`, 'success');
    } catch (error: any) {
      console.error("Failed to save event:", error);
      showToast(`Failed to save event: ${error.message || 'Unknown error'}`, 'error');
      // Revert optimistic update on failure
      refreshData();
    }
  };

  const handleSaveUser = async (newUser: User) => {
    try {
      // Pre-check for duplicates to avoid DB constraint error
      const users = await UserStore.getAll();
      if (users.some(u => u.username?.toLowerCase() === newUser.username?.toLowerCase())) {
        // If username is empty (invite flow), allow it (no username to check yet)
        if (newUser.username) {
          alert(`Error: The username "${newUser.username}" is already taken. Please choose another.`);
          return;
        }
      }

      // Check for duplicate EMAIL (Critical for invites)
      if (newUser.email && users.some(u => u.email?.toLowerCase() === newUser.email?.toLowerCase())) {
        alert(`Error: The email "${newUser.email}" is already registered.`);
        throw new Error(`The email "${newUser.email}" is already registered.`);
      }

      const updatedUsers = await UserStore.add(newUser);
      setAllUsers(updatedUsers);
      // Wait, in invite flow we already alerted. But this might be generic "Add User".
      // ActionPanel handles alerts for invite flow.
      // But ActionPanel calls this.
      // If ActionPanel triggered Invite, it called alert() already?
      // No, ActionPanel calls onSaveUser THEN alert.
      // handleSaveUser alerts "created successfully".
      // We can check if it's invite flow? ActionPanel handles the flow.
      // But ActionPanel calls onSaveUser.

    } catch (e: any) {
      alert(e.message || "Failed to add user");
      throw e; // Re-throw so ActionPanel knows to stop
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const updatedUsers = await UserStore.remove(userId);
    setAllUsers(updatedUsers);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const users = await UserStore.update(updatedUser);
      setAllUsers(users);
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

    // Redirect after setup
    const targetTab = getDashboardForUser(updatedUser);
    setActiveTab(targetTab);
    localStorage.setItem('ministry_active_tab', targetTab);
  };


  if (!currentUser) {
    // If on setup-account valid path but waiting for Auth?
    // We can show Loading... 
    // But SignIn handles login.
    return <SignIn onLogin={handleLogin} error={loginError} />;
  }

  // FORCE Setup if username is missing
  if (activeTab === 'setup-account' || !currentUser.username) {
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {activeTab === 'dashboard' && <Dashboard openModal={setModalType} onNavigate={handleNavigate} />}
          {activeTab === 'team-dashboard' && <TeamLeaderDashboard onNavigate={handleNavigate} />}
          {activeTab === 'departments' && <DepartmentsView onNavigate={handleNavigate} currentUser={currentUser} />}
          {activeTab === 'events' && <EventsView events={events} />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && (
            <SettingsView
              users={allUsers}
              openModal={setModalType}
              onDeleteUser={handleDeleteUser}
              currentUser={currentUser}
              onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }}
            />
          )}
          {activeTab === 'manifest-settings' && (
            <SettingsView
              users={allUsers}
              openModal={setModalType}
              onDeleteUser={handleDeleteUser}
              currentUser={currentUser}
              initialTab="manifest"
              onEditUser={(u) => { setTargetUser(u); setModalType(ModalType.EDIT_USER); }}
            />
          )}
          {activeTab === 'registration' && <RegistrationDashboard events={events} currentUser={currentUser} onOpenModal={setModalType} />}
          {activeTab === 'next-gen' && <NextGenDashboard events={events} currentUser={currentUser} onOpenModal={setModalType} />}
          {activeTab === 'transportation' && <TransportationDashboard currentUser={currentUser} events={events} onOpenModal={setModalType} />}
          {activeTab === 'finance' && <FinanceDashboard currentUser={currentUser} onOpenModal={setModalType} />}
          {activeTab === 'follow-up' && <FollowUpDashboard onOpenModal={setModalType} />}
          {activeTab === 'parking' && <ParkingDashboard events={events} onOpenModal={setModalType} />}
          {activeTab === 'schools' && <SchoolsDashboard currentUser={currentUser} events={events} onOpenModal={setModalType} />}
          {activeTab === 'requisitions' && (
            currentUser?.role === 'TeamLeader'
              ? <TeamLeaderRequisitions currentUser={currentUser} />
              : <RequisitionsView currentUser={currentUser} />
          )}
          {activeTab === 'public-soul-entry' && <PublicSoulEntry />}
          {activeTab === 'assets' && (
            <div className="p-4 md:p-8">
              <h1 className="text-3xl font-bold text-ministry-text mb-6">Assets Management</h1>
              <AssetsTab currentUser={currentUser} />
            </div>
          )}

          {activeTab !== 'dashboard' && activeTab !== 'team-dashboard' && activeTab !== 'departments' && activeTab !== 'events' && activeTab !== 'reports' && activeTab !== 'settings' && activeTab !== 'manifest-settings' && activeTab !== 'registration' && activeTab !== 'next-gen' && activeTab !== 'transportation' && activeTab !== 'finance' && activeTab !== 'follow-up' && activeTab !== 'parking' && activeTab !== 'requisitions' && activeTab !== 'assets' && activeTab !== 'schools' && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Work in Progress</h2>
                <p>The {activeTab} module is currently under development.</p>
              </div>
            </div>
          )}
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
