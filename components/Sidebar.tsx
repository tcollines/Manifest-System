
import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart2,
  Settings,
  LogOut,
  Cross,
  ClipboardCheck,
  Bus,
  Baby,
  CreditCard,
  Car,
  Map,
  Globe,
  X,
  FileText,
  Package,
  BookOpen
} from 'lucide-react';
import { ModalType, User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, onLogout, isOpen, onClose }) => {

  // Custom Menus based on Department Leads
  const isRegistrationHead = currentUser.role === 'Head of Dept' && currentUser.departmentId === 'd1';
  const isNextGenHead = currentUser.role === 'Head of Dept' && currentUser.departmentId === 'd2';
  const isParkingHead = currentUser.role === 'Head of Dept' && currentUser.departmentId === 'd3';
  const isFinanceHead = currentUser.role === 'Head of Dept' && currentUser.departmentId === 'd4';
  const isTransportationHead = currentUser.role === 'Head of Dept' && currentUser.departmentId === 'd5';
  const isSchoolsHead = currentUser.role === 'Head of Dept' && currentUser.departmentId === 'd7';
  const isCoordinator = currentUser.role === 'Coordinator';
  const isLogisticsEntrant = currentUser.role === 'Logistics';
  const isTeamLeader = currentUser.role === 'TeamLeader';

  let menuItems: any[] = [];

  // Schools Head Menu
  if (isSchoolsHead) {
    menuItems = [
      { id: 'schools', label: 'Schools Dashboard', icon: BookOpen },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isRegistrationHead) {
    menuItems = [
      { id: 'registration', label: 'Registration Dashboard', icon: ClipboardCheck },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isNextGenHead) {
    menuItems = [
      { id: 'next-gen', label: 'Next Gen Dashboard', icon: Baby },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isParkingHead) {
    menuItems = [
      { id: 'parking', label: 'Parking Dashboard', icon: Car },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isTransportationHead) {
    menuItems = [
      { id: 'transportation', label: 'Transportation Dashboard', icon: Bus },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isFinanceHead) {
    menuItems = [
      { id: 'finance', label: 'Finance Dashboard', icon: CreditCard },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isCoordinator) {
    menuItems = [
      { id: 'transportation', label: 'My Vehicle', icon: Bus },
    ];
  } else if (isLogisticsEntrant) {
    menuItems = [
      { id: 'registration', label: 'Logistics Entry', icon: Bus },
    ];
  } else if (isTeamLeader) {
    // Team Leader gets all Admin tabs + Manifest Settings
    menuItems = [
      { id: 'team-dashboard', label: 'Dashboard', icon: LayoutDashboard }, // Read-only dashboard
      { id: 'departments', label: 'Departments', icon: Users },
      { id: 'events', label: 'Events & Services', icon: Calendar },
      { id: 'reports', label: 'Reports', icon: BarChart2 },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
      { id: 'manifest-settings', label: 'Manifest Settings', icon: Map }, // Extra Tab
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
  } else {
    // Standard logic for Admin and others
    const allMenuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Administrator', 'Head of Dept', 'Staff', 'Volunteer'] },
      // Finance removed from main sidebar for Admin, accessed via Department Card
      { id: 'departments', label: 'Departments', icon: Users, roles: ['Administrator'] },
      { id: 'events', label: 'Events & Services', icon: Calendar, roles: ['Administrator', 'Head of Dept', 'Staff'] },
      { id: 'reports', label: 'Reports', icon: BarChart2, roles: ['Administrator', 'Head of Dept'] },
      { id: 'requisitions', label: 'Requisitions', icon: FileText, roles: ['Administrator', 'Head of Dept', 'Staff'] },
      { id: 'assets', label: 'Assets', icon: Package, roles: ['Administrator', 'Head of Dept'] },
      { id: 'settings', label: 'Settings', icon: Settings, roles: ['Administrator', 'Head of Dept', 'Staff', 'Volunteer'] },
    ];

    menuItems = allMenuItems.filter(item => {
      if (currentUser.role === 'Administrator') return true;
      const hasRoleAccess = item.roles.includes(currentUser.role);
      return hasRoleAccess;
    });
  }

  const handleItemClick = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-screen w-64 bg-ministry-dark border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 shadow-2xl md:shadow-none`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-ministry-neon p-2 rounded-lg">
              <Globe className="w-6 h-6 text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight text-ministry-text">Entebbe <span className="text-ministry-orange">Manifest</span></span>
          </div>
          <button onClick={onClose} className="md:hidden p-1 text-gray-500 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-ministry-neon text-black font-semibold shadow-md'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-ministry-orange'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-4 mt-2 border-t border-gray-100 pb-8">
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
