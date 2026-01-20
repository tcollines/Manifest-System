
import React, { useState, useEffect } from 'react';
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
import ParkingDashboard from './components/ParkingDashboard';
import TeamLeaderDashboard from './components/TeamLeaderDashboard';
import ActionPanel from './components/ActionPanel';
import MinistryAI from './components/MinistryAI';
import SignIn from './components/SignIn';
import { ModalType, MinistryEvent, User } from './types';
import { MOCK_EVENTS, DEPARTMENTS } from './constants';
import { UserStore } from './database/userStore';
import { EventStore } from './database/eventStore';
import { Bell, Search, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Initialize activeTab from localStorage if available to persist screen on refresh
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ministry_active_tab') || 'dashboard');
  const [modalType, setModalType] = useState<ModalType>(ModalType.NONE);
  const [events, setEvents] = useState<MinistryEvent[]>(MOCK_EVENTS);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Persist activeTab whenever it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ministry_active_tab', activeTab);
    }
  }, [activeTab, currentUser]);

  // Initialize Users and Check Session
  useEffect(() => {
    const init = async () => {
      // 1. Restore Session
      const sessionUser = UserStore.getSession();
      if (sessionUser) {
        setCurrentUser(sessionUser);
        // activeTab is already restored via useState initializer
      } else {
        // If no valid session, ensure no stale tab is kept (though SignIn covers the view)
        localStorage.removeItem('ministry_active_tab');
      }

      // 2. Load Data
      await refreshData();
    };
    init();
  }, []);

  const handleLogin = async (username: string, password: string) => {
    // Reload users to ensure we have latest data from the store
    const users = await UserStore.getAll();

    // Case-insensitive username check, exact password check
    const foundUser = users.find(u =>
      u.username?.trim().toLowerCase() === username.trim().toLowerCase() &&
      u.password === password
    );

    if (foundUser) {
      setCurrentUser(foundUser);
      UserStore.saveSession(foundUser); // Persist session

      // Determine default tab based on role/department
      let defaultTab = 'dashboard';
      if (foundUser.role === 'Logistics') {
        defaultTab = 'registration';
      } else if (foundUser.role === 'Coordinator') {
        defaultTab = 'transportation';
      } else if (foundUser.role === 'TeamLeader') {
        defaultTab = 'team-dashboard';
      } else if (foundUser.role !== 'Administrator' && foundUser.departmentId === 'd1') { // Registration Dept
        defaultTab = 'registration';
      } else if (foundUser.role !== 'Administrator' && foundUser.departmentId === 'd2') { // Next Gen Dept
        defaultTab = 'next-gen';
      } else if (foundUser.role !== 'Administrator' && foundUser.departmentId === 'd3') { // Parking Dept
        defaultTab = 'parking';
      } else if (foundUser.role !== 'Administrator' && foundUser.departmentId === 'd5') { // Transportation
        defaultTab = 'transportation';
      } else if (foundUser.role !== 'Administrator' && foundUser.departmentId === 'd4') { // Finance
        defaultTab = 'finance';
      }

      setActiveTab(defaultTab);
      setLoginError(null);
    } else {
      setLoginError('Invalid credentials. Please try again.');
    }
  };

  const handleLogout = () => {
    UserStore.clearSession(); // Clear session
    localStorage.removeItem('ministry_active_tab'); // Clear persisted tab
    setCurrentUser(null);
    setActiveTab('dashboard');
    setLoginError(null);
    setIsSidebarOpen(false);
  };

  const handleNavigate = (view: string) => {
    setActiveTab(view);
    setIsSidebarOpen(false);
  };

  const handleSaveEvent = async (newEvent: MinistryEvent) => {
    try {
      // Optimistic update
      setEvents(prev => [newEvent, ...prev]);

      // Save to DB
      await EventStore.add(newEvent);

      // Refresh from DB to ensure sync
      const updatedEvents = await EventStore.getAll();
      setEvents(updatedEvents);

      alert(`${newEvent.type} created successfully!`);
    } catch (error: any) {
      console.error("Failed to save event:", error);
      alert(`Failed to save event: ${error.message || 'Unknown error'}`);
      // Revert optimistic update on failure (optional, simplistic approach here)
      refreshData();
    }
  };

  const handleSaveUser = async (newUser: User) => {
    try {
      // Pre-check for duplicates to avoid DB constraint error
      const users = await UserStore.getAll();
      if (users.some(u => u.username?.toLowerCase() === newUser.username?.toLowerCase())) {
        alert(`Error: The username "${newUser.username}" is already taken. Please choose another.`);
        return;
      }

      const updatedUsers = await UserStore.add(newUser);
      setAllUsers(updatedUsers);
      alert(`User ${newUser.name} created successfully.`);
    } catch (e: any) {
      alert(e.message || "Failed to add user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const updatedUsers = await UserStore.remove(userId);
    setAllUsers(updatedUsers);
  };

  if (!currentUser) {
    return <SignIn onLogin={handleLogin} error={loginError} />;
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
          {activeTab === 'departments' && <DepartmentsView onNavigate={handleNavigate} />}
          {activeTab === 'events' && <EventsView events={events} />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && (
            <SettingsView
              users={allUsers}
              openModal={setModalType}
              onDeleteUser={handleDeleteUser}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'manifest-settings' && (
            <SettingsView
              users={allUsers}
              openModal={setModalType}
              onDeleteUser={handleDeleteUser}
              currentUser={currentUser}
              initialTab="manifest"
            />
          )}
          {activeTab === 'registration' && <RegistrationDashboard events={events} currentUser={currentUser} />}
          {activeTab === 'next-gen' && <NextGenDashboard events={events} />}
          {activeTab === 'transportation' && <TransportationDashboard currentUser={currentUser} events={events} />}
          {activeTab === 'finance' && <FinanceDashboard currentUser={currentUser} />}
          {activeTab === 'parking' && <ParkingDashboard events={events} />}

          {activeTab !== 'dashboard' && activeTab !== 'team-dashboard' && activeTab !== 'departments' && activeTab !== 'events' && activeTab !== 'reports' && activeTab !== 'settings' && activeTab !== 'manifest-settings' && activeTab !== 'registration' && activeTab !== 'next-gen' && activeTab !== 'transportation' && activeTab !== 'finance' && activeTab !== 'parking' && (
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
        currentUser={currentUser}
      />
      {modalType === ModalType.AI_INSIGHTS && <MinistryAI onClose={() => setModalType(ModalType.NONE)} />}
    </div>
  );
};

export default App;
