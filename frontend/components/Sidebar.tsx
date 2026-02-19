
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
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
  BookOpen,
  Phone,
  UserPlus,
  Heart
} from 'lucide-react';
import { ModalType, User, Department } from '../types';

interface SidebarProps {
  currentUser: User;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUser, onLogout, isOpen, onClose }) => {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const { apiFetch } = await import('../services/api');
        const data = await apiFetch('/departments');
        if (Array.isArray(data)) setDepartments(data);
      } catch (e) {
        console.error("Failed to load departments in sidebar", e);
      }
    };
    fetchDepts();
  }, []);

  // Refactored to use SLUGS instead of ID strings
  const getDeptId = (identifier: string) => {
    // 1. Try to find by slug (Preferred)
    const bySlug = departments.find(d => d.slug === identifier);
    if (bySlug) return bySlug.id;

    // 2. Fallback: Try to find by code/id (Legacy)
    return departments.find(d => (d.code || d.id) === identifier)?.id;
  };

  const checkDept = (slugOrCode: string) => {
    const targetDeptId = getDeptId(slugOrCode);
    if (!targetDeptId) return false;

    // Check against user's assigned department (UUID or Legacy ID)
    return currentUser.departmentUid === targetDeptId ||
      currentUser.departmentId === slugOrCode ||
      currentUser.departmentId === targetDeptId;
  };

  // Custom Menus based on Department Leads
  const isRegistrationHead = (currentUser.role === 'Head of Dept' || currentUser.role === 'Dept Admin') && checkDept('registration');
  const isNextGenHead = (currentUser.role === 'Head of Dept' || currentUser.role === 'Dept Admin' || currentUser.role === 'Staff' || currentUser.role === 'Member') && checkDept('next-gen');
  const isParkingHead = (currentUser.role === 'Head of Dept' || currentUser.role === 'Dept Admin') && checkDept('parking');
  const isFinanceHead = (currentUser.role === 'Head of Dept' || currentUser.role === 'Dept Admin') && checkDept('finance');
  const isTransportationHead = (currentUser.role === 'Head of Dept' || currentUser.role === 'Dept Admin') && checkDept('transportation');
  const isSchoolsHead = (currentUser.role === 'Head of Dept' || currentUser.role === 'Dept Admin') && checkDept('schools');
  // Healing Head or Staff (d8) - Restricted View
  const isHealingHead = (currentUser.role === 'Head of Dept' || currentUser.role === 'Dept Admin' || currentUser.role === 'Staff') && checkDept('healing');

  const isStageCoordinator = (currentUser.role === 'Stage Coordinator' || currentUser.role === 'Coordinator') && !!currentUser.stationId;
  const isVehicleCoordinator = (currentUser.role === 'Vehicle Coordinator' || currentUser.role === 'Coordinator') && !currentUser.stationId;
  const isLogisticsEntrant = currentUser.role === 'Logistics';
  const isTeamLeader = currentUser.role === 'TeamLeader';
  const isFollowUpHead = (currentUser.role === 'Head of Dept' || currentUser.role === 'Dept Admin') && checkDept('follow-up');
  const isFollowUpMember = currentUser.role === 'Member' && checkDept('follow-up');

  let menuItems: any[] = [];

  // Schools Head Menu
  if (isSchoolsHead) {
    menuItems = [
      { id: 'schools', label: 'Schools Dashboard', icon: BookOpen },
      { id: 'reports', label: 'Monthly Reports', icon: BarChart2 },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isRegistrationHead) {
    menuItems = [
      { id: 'registration', label: 'Registration Dashboard', icon: ClipboardCheck },
      { id: 'reports', label: 'Monthly Reports', icon: BarChart2 },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isNextGenHead) {
    menuItems = [
      { id: 'next-gen', label: 'Next Gen Dashboard', icon: Baby },
      { id: 'next-gen-follow-up', label: 'Follow Up', icon: UserPlus },
      { id: 'next-gen-reports', label: 'Stats Reports', icon: BarChart2 }, // kept original next-gen-reports
      { id: 'reports', label: 'Monthly Reports', icon: FileText }, // Added distinct
      { id: 'events', label: 'Events & Services', icon: Calendar },
      { id: 'next-gen-team', label: 'Volunteer Team', icon: Users },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
    // Next Gen Staff should not see Reports or Team Management
    if (currentUser.role === 'Staff') {
      menuItems = menuItems.filter(i => !['reports', 'next-gen-reports', 'settings', 'requisitions', 'assets'].includes(i.id));
    }
    // Next Gen Member should only see Dashboard and Follow Up
    if (currentUser.role === 'Member') {
      menuItems = menuItems.filter(i => ['next-gen', 'next-gen-follow-up'].includes(i.id));
    }

  } else if (isParkingHead) {
    menuItems = [
      { id: 'parking', label: 'Parking Dashboard', icon: Car },
      { id: 'reports', label: 'Monthly Reports', icon: BarChart2 },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isTransportationHead) {
    menuItems = [
      { id: 'transportation', label: 'Transportation Dashboard', icon: Bus },
      { id: 'reports', label: 'Monthly Reports', icon: BarChart2 },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isFinanceHead) {
    menuItems = [
      { id: 'finance', label: 'Finance Dashboard', icon: CreditCard },
      { id: 'reports', label: 'Monthly Reports', icon: BarChart2 },
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isHealingHead) {
    menuItems = [
      { id: 'healing', label: 'Healing Dept', icon: Heart },
      { id: 'reports', label: 'Monthly Reports', icon: BarChart2 },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
    // Healing Staff should not see Reports or Settings
    if (currentUser.role === 'Staff') {
      menuItems = menuItems.filter(i => !['reports', 'settings', 'requisitions', 'assets'].includes(i.id));
    }
  } else if (isFollowUpHead) {
    menuItems = [
      { id: 'follow-up', label: 'Follow Up Dashboard', icon: UserPlus },
      { id: 'reports', label: 'Monthly Reports', icon: BarChart2 }, // Added
      { id: 'settings', label: 'Team Management', icon: Users },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
    ];
  } else if (isFollowUpMember) {
    menuItems = [
      { id: 'follow-up', label: 'Follow Up Dashboard', icon: UserPlus },
    ];
  } else if (isStageCoordinator) {
    menuItems = [
      { id: 'stage-dashboard', label: 'Stage Dashboard', icon: Bus },
    ];
  } else if (isVehicleCoordinator) {
    menuItems = [
      { id: 'transportation', label: 'Vehicle Dashboard', icon: Bus },
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
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Administrator', 'Head of Dept', 'Staff', 'Volunteer'], path: '/dashboard' },
      // Finance removed from main sidebar for Admin, accessed via Department Card
      { id: 'departments', label: 'Departments', icon: Users, roles: ['Administrator'], path: '/departments' },
      { id: 'events', label: 'Events & Services', icon: Calendar, roles: ['Administrator', 'Head of Dept', 'Staff'], path: '/events' },
      { id: 'reports', label: 'Reports', icon: BarChart2, roles: ['Administrator', 'Head of Dept'], path: '/reports' },
      { id: 'requisitions', label: 'Requisitions', icon: FileText, roles: ['Administrator', 'Head of Dept', 'Staff'], path: '/requisitions' },
      { id: 'assets', label: 'Assets', icon: Package, roles: ['Administrator', 'Head of Dept'], path: '/assets' },
      { id: 'settings', label: 'Settings', icon: Settings, roles: ['Administrator', 'Head of Dept', 'Staff', 'Volunteer'], path: '/settings' },
    ];

    menuItems = allMenuItems.filter(item => {
      if (currentUser.role === 'Administrator') return true;
      const hasRoleAccess = item.roles.includes(currentUser.role);
      return hasRoleAccess;
    });
  }

  // Helper to get path for dynamically built menus above
  // Since I didn't update the if/else blocks specific menus, I need to map them or update them.
  // Let's check the if/else blocks and update them to include paths.

  // Wait, I can't inject logic in replacement chunk easily.
  // I should update the menu definitions in the logic flow.
  // Since I can't easily replace the whole block effectively without huge context.

  // I will assume for now I will fix the menu items in a second pass or broader replace.
  // Actually, let's look at the previous lines. I can replace the whole logic block if I am careful.

  // Better yet, I will use a separate replacement for the menu logic or just map IDs to paths afterwards if needed.
  // But NavLink needs `to`.

  // Let's redefine menuItems construction.



  const getPath = (id: string) => {
    switch (id) {
      case 'dashboard': return '/dashboard';
      case 'team-dashboard': return '/team-dashboard';
      case 'departments': return '/departments';
      case 'events': return '/events';
      case 'reports': return '/reports';
      case 'requisitions': return '/requisitions';
      case 'assets': return '/assets';
      case 'manifest-settings': return '/manifest-settings';
      case 'settings': return '/settings';
      case 'registration': return '/registration';
      case 'next-gen': return '/next-gen';
      case 'next-gen-follow-up': return '/next-gen-follow-up';
      case 'next-gen-team': return '/next-gen-team';
      case 'next-gen-reports': return '/next-gen-reports';
      case 'parking': return '/parking';
      case 'finance': return '/finance';
      case 'transportation': return '/transportation';
      case 'schools': return '/schools';
      case 'follow-up': return '/follow-up';
      case 'healing': return '/healing';
      case 'stage-dashboard': return '/stage-dashboard';
      default: return '/dashboard';
    }
  }

  const handleItemClick = () => {
    if (window.innerWidth < 768) {
      onClose();
    }
  }

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
            const path = item.path || getPath(item.id);
            return (
              <NavLink
                key={item.id}
                to={path}
                onClick={handleItemClick}
                className={({ isActive }) => `w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-ministry-neon text-black font-semibold shadow-md'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <Icon className="w-5 h-5 group-hover:text-ministry-orange text-current" />
                <span>{item.label}</span>
              </NavLink>
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
