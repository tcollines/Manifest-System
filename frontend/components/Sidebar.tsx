import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Bus, ClipboardList, Map, BookOpen, Clock, FileCheck, Package, Menu, X, Settings, Heart, Database, BarChart2, Building2, DollarSign, ClipboardCheck, Baby, Car, Globe, LogOut, CheckCircle, ArrowRight, UserPlus, FileText, CreditCard, ShoppingCart, Box, Truck } from 'lucide-react';
import { Department } from '../types';
import { useAuth } from '../context/AuthContext';
import { resolveDepartment } from '../constants/departmentMap';

interface SidebarProps {
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
    id: string;
    label: string;
    icon: any;
    path: string;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, isOpen, onClose }) => {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const [departments, setDepartments] = useState<Department[]>([]);

  if (!currentUser) return null;

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

  const getDeptId = (identifier: string) => {
    const bySlug = departments.find(d => d.slug === identifier);
    if (bySlug) return bySlug.id;
    return departments.find(d => (d.code || d.id) === identifier)?.id;
  };

  const resolveDeptId = (slug: string) => getDeptId(slug) ?? currentUser.departmentUid ?? currentUser.departmentId;

  // Roles Definition
  const isSystemAdmin = ['Administrator', 'Super Admin'].includes(currentUser.role);
  const isTeamLeader = currentUser.role === 'TeamLeader';
  const roleHOD  = ['Head of Dept', 'HOD', 'Dept Admin'].includes(currentUser.role);
  const isGlobalFinance = ['Dept Finance', 'Finance', 'Head of Dept', 'HOD', 'Dept Admin'].includes(currentUser.role) && (currentUser.departmentId === 'd4' || currentUser.departmentId === 'e35f6789-1862-4c31-8b13-96d59463d257'); 
  const isDeptFinance = currentUser.role === 'Dept Finance' && !isGlobalFinance;

  const checkCode = (...codes: string[]) => {
    if (codes.some(c => currentUser.departmentId === c || currentUser.departmentUid === c)) return true;
    const resolved = resolveDepartment(currentUser.departmentId || '');
    return !!resolved && codes.includes(resolved.slug);
  };

  // Nav construction
  let sections: NavSection[] = [];

  // 1. Top-Level / General
  if (isSystemAdmin || isTeamLeader) {
      sections.push({
          title: '',
          items: [
              { id: 'sys-overview', label: 'Ministry Overview', icon: Globe, path: '/dashboard' },
              { id: 'sys-departments', label: 'Manage Departments', icon: Building2, path: '/departments' }
          ]
      });
  }

  // 2. My Department (User's specific operational context)
  const dId = resolveDeptId(currentUser.departmentId || '');
  let myDeptItems: NavItem[] = [];

  const isElevatedRegistration = ['Administrator', 'Super Admin', 'Head of Dept', 'HOD', 'Department Head', 'Dept Admin', 'Reg. Admin', 'Registration Admin', 'Registration Head', 'TeamLeader'].includes(currentUser.role);
  const isRegularRegistration = checkCode('d1', 'registration') && !isElevatedRegistration;
  const isStageCoordinator = checkCode('d5', 'transportation') && (currentUser.role === 'Stage Coordinator' || (currentUser.role === 'Coordinator' && !!currentUser.stationId));
  const isVehicleCoordinator = checkCode('d5', 'transportation') && currentUser.role === 'Vehicle Coordinator';

  if (!isRegularRegistration && !isStageCoordinator && !isVehicleCoordinator && !checkCode('d11', 'sales')) {
      myDeptItems.push({ id: 'my-dept-ops', label: 'Dept Dashboard', icon: LayoutDashboard, path: `/departments/${dId}/dashboard` });
  }

  if (checkCode('d1', 'registration')) {
      myDeptItems.push({ id: 'reg-checkin', label: 'Service Check-In', icon: ClipboardCheck, path: `/departments/${dId}/check-in` });
      if (isElevatedRegistration) {
          myDeptItems.push({ id: 'reg-events', label: 'Events Check-In', icon: Calendar, path: `/departments/${dId}/events` });
          myDeptItems.push({ id: 'reg-db', label: 'Member Database', icon: Database, path: `/departments/${dId}/database` });
      }
  } else if (checkCode('d2', 'next-gen')) {
      myDeptItems.push({ id: 'ng-checkin', label: 'Service Check-In', icon: Baby, path: `/departments/${dId}/checkin` });
      myDeptItems.push({ id: 'ng-checkout', label: 'Check-Out', icon: LogOut, path: `/departments/${dId}/checkout` });
      myDeptItems.push({ id: 'ng-souls', label: 'Next Gen Souls', icon: Heart, path: `/departments/${dId}/souls` });
      myDeptItems.push({ id: 'ng-db', label: 'Member Database', icon: Database, path: `/departments/${dId}/database` });
  } else if (checkCode('d3', 'parking')) {
      myDeptItems.push({ id: 'park-checkin', label: 'Parking Check-In', icon: Car, path: `/departments/${dId}/checkin` });
      myDeptItems.push({ id: 'park-db', label: 'Member Database', icon: Database, path: `/departments/${dId}/database` });
  } else if (checkCode('d4', 'finance')) {
      myDeptItems.push({ id: 'fin-income', label: 'Income', icon: DollarSign, path: `/departments/${dId}/income` });
      myDeptItems.push({ id: 'fin-expenses', label: 'Expenses', icon: CreditCard, path: `/departments/${dId}/expenses` });
      myDeptItems.push({ id: 'fin-req', label: 'Requisitions', icon: FileText, path: `/departments/${dId}/requisitions` });
      myDeptItems.push({ id: 'fin-fleet', label: 'Fleet Management', icon: Bus, path: `/departments/${dId}/fleet` });
  } else if (checkCode('d5', 'transportation')) {
      if (isStageCoordinator) {
          myDeptItems.push({ id: 'tr-stage-dash', label: 'Stage Dashboard', icon: LayoutDashboard, path: `/departments/${dId}/stage-dashboard` });
      } else if (isVehicleCoordinator) {
          myDeptItems.push({ id: 'tr-overview', label: 'Overview', icon: LayoutDashboard, path: `/departments/${dId}/overview` });
      } else {
          myDeptItems.push({ id: 'tr-overview', label: 'Overview', icon: LayoutDashboard, path: `/departments/${dId}/overview` });
          myDeptItems.push({ id: 'tr-coordinators', label: 'Coordinators', icon: Users, path: `/departments/${dId}/coordinators` });
          myDeptItems.push({ id: 'tr-stages', label: 'Stages', icon: Map, path: `/departments/${dId}/stages` });
      }
  } else if (checkCode('d6', 'follow-up')) {
      myDeptItems.push({ id: 'fu-services', label: 'Services', icon: ClipboardCheck, path: `/departments/${dId}/services` });
      myDeptItems.push({ id: 'fu-events', label: 'Events', icon: Calendar, path: `/departments/${dId}/events` });
      myDeptItems.push({ id: 'fu-ft', label: 'First Timers', icon: UserPlus, path: `/departments/${dId}/first-timers` });
      myDeptItems.push({ id: 'fu-members', label: 'Members', icon: Users, path: `/departments/${dId}/members` });
      myDeptItems.push({ id: 'fu-db', label: 'Database', icon: Database, path: `/departments/${dId}/database` });
      myDeptItems.push({ id: 'fu-analysis', label: 'Analysis', icon: BarChart2, path: `/departments/${dId}/analysis` });
  } else if (checkCode('d7', 'schools')) {
      myDeptItems.push({ id: 'sch-reports', label: 'Reports', icon: BarChart2, path: `/departments/${dId}/reports` });
      myDeptItems.push({ id: 'sch-events', label: 'Events', icon: Calendar, path: `/departments/${dId}/events` });
  } else if (checkCode('d8', 'healing')) {
      myDeptItems.push({ id: 'hl-overview', label: 'Overview', icon: LayoutDashboard, path: `/departments/${dId}/overview` });
      myDeptItems.push({ id: 'hl-reports', label: 'Reports', icon: BarChart2, path: `/departments/${dId}/reports` });
      myDeptItems.push({ id: 'hl-souls', label: 'Souls', icon: Heart, path: `/departments/${dId}/souls` });
      myDeptItems.push({ id: 'hl-testimonies', label: 'Testimonies', icon: BookOpen, path: `/departments/${dId}/testimonies` });
      myDeptItems.push({ id: 'hl-new', label: 'New Entry', icon: FileCheck, path: `/departments/${dId}/new` });
  } else if (checkCode('d11', 'sales')) {
      myDeptItems.push({ id: 'sales-dash', label: 'Sales Dashboard', icon: LayoutDashboard, path: `/departments/${dId}/sales-dashboard` });
      myDeptItems.push({ id: 'sales-pos', label: 'POS Terminal', icon: ShoppingCart, path: `/departments/${dId}/pos` });
      myDeptItems.push({ id: 'sales-products', label: 'Products', icon: Package, path: `/departments/${dId}/products` });
      myDeptItems.push({ id: 'sales-inventory', label: 'Inventory', icon: Box, path: `/departments/${dId}/inventory` });
      myDeptItems.push({ id: 'sales-orders', label: 'Orders', icon: BarChart2, path: `/departments/${dId}/orders` });
      myDeptItems.push({ id: 'sales-customers', label: 'Customers', icon: Users, path: `/departments/${dId}/customers` });
      myDeptItems.push({ id: 'sales-procurement', label: 'Procurement', icon: Truck, path: `/departments/${dId}/procurement` });
      myDeptItems.push({ id: 'sales-financials', label: 'Reports & Financials', icon: FileText, path: `/departments/${dId}/financials` });
  }

  if (roleHOD || isDeptFinance || isGlobalFinance || isSystemAdmin || isTeamLeader) {
      if (roleHOD || isSystemAdmin || isTeamLeader || (!isDeptFinance && !isGlobalFinance)) {
          myDeptItems.push({ id: 'my-dept-team', label: 'Team Management', icon: Users, path: `/departments/${dId}/dashboard?tab=team` });
          myDeptItems.push({ id: 'my-dept-schedule', label: 'Service Schedule', icon: Calendar, path: `/departments/${dId}/dashboard?tab=schedule` });
          myDeptItems.push({ id: 'my-dept-reports', label: 'Monthly Reports', icon: BarChart2, path: `/departments/${dId}/dashboard?tab=reports` });
      }

      myDeptItems.push({ id: 'my-dept-workplans', label: 'Monthly Workplans', icon: ClipboardList, path: `/departments/${dId}/dashboard?tab=workplans` });
      myDeptItems.push({ id: 'my-dept-reqs', label: 'Requisitions Tracker', icon: FileText, path: `/departments/${dId}/dashboard?tab=requisitions` });
      // Assets is globally available to admins of depts
      myDeptItems.push({ id: 'my-dept-assets', label: 'Assets', icon: Package, path: `/departments/${dId}/dashboard?tab=assets` });
      
      if (isDeptFinance || isGlobalFinance || roleHOD || isSystemAdmin || isTeamLeader) {
          myDeptItems.push({ id: 'my-dept-finances', label: 'Dept Finances', icon: DollarSign, path: `/departments/${dId}/dashboard?tab=finances` });
      }
  }

  // Push My Department Section ALWAYS if items exist (but exclude Team Leader as per requirement)
  const isLogisticsRole = currentUser.role === 'Logistics';
  
  if (isLogisticsRole) {
      // Data Entrants ONLY get access to their Stage Dashboard
      let logisticsPath = `/departments/d1/events`;
      
      // Try to append cached parameters if they exist to match the exact URL
      try {
         const cachedEvent = localStorage.getItem(`cached_logistics_event_${currentUser.id}`);
         const cachedStation = localStorage.getItem(`cached_logistics_station_${currentUser.id}`);
         if (cachedEvent && cachedStation) {
            const e = JSON.parse(cachedEvent);
            const s = JSON.parse(cachedStation);
            logisticsPath += `?eventId=${e.id}&stationId=${s.id}`;
         }
      } catch(e) {}

      sections.push({
          title: 'My Station',
          items: [
              { id: 'reg-events', label: 'Stage Dashboard', icon: LayoutDashboard, path: logisticsPath }
          ]
      });
  } else if (myDeptItems.length > 0 && !isTeamLeader) {
      sections.push({ title: 'My Department', items: myDeptItems });
  }

  // 2. Manifest Operations & Approvals (Team Leader / Systems Admins)
  if (isTeamLeader || isSystemAdmin) {
      const globalApprovalItems = [
          { id: 'global-reports', label: 'Manifest Reports', icon: BarChart2, path: '/reports' },
          { id: 'global-assets', label: 'Manifest Assets', icon: Package, path: '/assets' },
          { id: 'global-schedules', label: 'Manifest Service Schedule', icon: Calendar, path: '/schedules' },
          { id: 'global-workplans', label: 'Review Workplans', icon: FileCheck, path: '/approvals/workplans' }
      ];
      
      // ONLY Team Leaders approve requisitions
      if (isTeamLeader) {
          globalApprovalItems.splice(1, 0, { id: 'global-requisitions', label: 'Requisitions Queue', icon: FileText, path: '/approvals/requisitions' });
      } else if (isSystemAdmin) {
          globalApprovalItems.splice(1, 0, { id: 'admin-requisitions', label: 'Manifest Requisitions', icon: FileText, path: '/approvals/adhoc-requisitions' });
      }

      sections.push({
          title: 'Manifest Approvals',
          items: globalApprovalItems
      });
  }

  // 3. Manifest Finance (Finance specific workers)
  const financeItems = [];
  
  // Req processing is designated ONLY for Global Finance workers to batch.
  if (isGlobalFinance) {
      financeItems.push({ id: 'finance-batches', label: 'Req processing', icon: CreditCard, path: '/finance/processing' });
  }

  // Avoid UI duplication: if user already has access to "global-workplans" we don't need a clone button labeled "Workplan Budgets" pointing to the SAME PAGE.
  if (isGlobalFinance && !isTeamLeader && !isSystemAdmin) {
      financeItems.push({ id: 'finance-budgets', label: 'Workplan Budgets', icon: BarChart2, path: '/approvals/workplans' });
  }

  if (financeItems.length > 0) {
      sections.push({
          title: 'Manifest Finance',
          items: financeItems
      });
  }

  // 4. System Administration
  if (isSystemAdmin || isTeamLeader) {
      sections.push({
          title: 'System Administration',
          items: [
              { id: 'sys-team', label: 'System Access', icon: Users, path: '/administration' },
              { id: 'manifest-settings', label: 'Manifest Setup', icon: Map, path: '/manifest-settings' }
          ]
      });
  }

  const handleItemClick = () => { 
    if (window.innerWidth < 768) {
      React.startTransition(() => {
        onClose();
      });
    }
  };

  return (
    <>
      <div className={`fixed top-0 left-0 h-[100dvh] w-64 bg-ministry-dark border-r border-gray-200 flex flex-col z-[60] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-2xl md:shadow-none`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-ministry-neon p-2 rounded-lg"><Globe className="w-6 h-6 text-black" /></div>
            <span className="text-xl font-bold tracking-tight text-ministry-text">Entebbe <span className="text-ministry-orange">Manifest</span></span>
          </div>
          <button onClick={onClose} className="md:hidden p-1 text-gray-500 hover:bg-gray-100 rounded-full"><X className="w-6 h-6" /></button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
          {sections.map((section, sidx) => (
              <div key={sidx} className="flex flex-col gap-1">
                  {section.title && <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">{section.title}</h4>}
                  <div className="space-y-1">
                      {section.items.map(item => {
                          const Icon = item.icon;
                          const isTabLink = !!item.path && item.path.includes('?tab=');
                          const isDashboardLink = !!item.path && item.path.endsWith('/dashboard') && !item.path.includes('?');

                          let isActiveItem = false;
                          if (isTabLink) {
                              const [itemPath, itemQuery] = item.path.split('?');
                              const itemTab = new URLSearchParams(itemQuery).get('tab');
                              const currentTab = new URLSearchParams(location.search).get('tab');
                              isActiveItem = location.pathname === itemPath && currentTab === itemTab;
                          } else if (isDashboardLink) {
                              isActiveItem = location.pathname === item.path && !new URLSearchParams(location.search).get('tab');
                          } else {
                              isActiveItem = location.pathname === item.path;
                          }

                          return (
                              <NavLink
                                  key={item.id}
                                  to={item.path}
                                  end
                                  onClick={handleItemClick}
                                  className={({ isActive }) => {
                                      const active = (isTabLink || isDashboardLink || (item.path && item.path.includes('/departments/'))) ? isActiveItem : isActive;
                                      return `w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${active ? 'bg-ministry-neon text-black font-semibold shadow-md' : 'text-gray-500 hover:bg-gray-100/5 hover:text-gray-300'}`;
                                  }}
                              >
                                  <Icon className={`w-5 h-5 group-hover:text-ministry-orange ${isActiveItem ? 'text-ministry-orange' : 'text-gray-400'}`} />
                                  <span className="text-sm">{item.label}</span>
                              </NavLink>
                          );
                      })}
                  </div>
              </div>
          ))}

          <div className="pt-4 mt-2 border-t border-gray-800 pb-8">
            <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-semibold">Sign Out</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
