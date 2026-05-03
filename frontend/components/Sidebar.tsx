import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Bus, ClipboardList, Map, BookOpen, Clock, FileCheck, Package, Menu, X, Settings, Heart, Database, BarChart2, Building2, DollarSign, ClipboardCheck, Baby, Car, Globe, LogOut, CheckCircle, ArrowRight, UserPlus, FileText, CreditCard } from 'lucide-react';
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

  const addCheckInRoute = (slug: string) => {
      if (checkCode('d1', 'registration')) return '/registration/check-in';
      if (checkCode('d3', 'parking')) return '/parking/checkin';
      if (checkCode('d2', 'next-gen')) return '/next-gen/checkin';
      if (checkCode('d5', 'transportation')) return `/departments/${dId}/overview`;
      if (checkCode('d7', 'schools')) return `/departments/${dId}`;
      if (checkCode('d8', 'healing')) return `/departments/${dId}/overview`;
      if (checkCode('d9', 'campus')) return `/departments/${dId}/families`;
      if (checkCode('d6', 'follow-up')) return `/departments/${dId}/services`;
      if (checkCode('d4', 'finance')) return `/departments/${dId}/income`;
      return `/departments/${dId}/dashboard`; // General fallback dashboard
  };

  const isFinanceDept = checkCode('d4', 'finance');

  if (isFinanceDept) {
      myDeptItems.push({ id: 'my-dept-finance-dash', label: 'Finance Dashboard', icon: CreditCard, path: `/departments/${dId}/income` });
  }

  myDeptItems.push({ id: 'my-dept-ops', label: 'Dept Dashboard', icon: LayoutDashboard, path: `/departments/${dId}/dashboard` });

  if (roleHOD || isDeptFinance || isGlobalFinance || isSystemAdmin || isTeamLeader) {
      if (!isDeptFinance && !isGlobalFinance) {
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
  if (myDeptItems.length > 0 && !isTeamLeader) {
      sections.push({ title: 'My Department', items: myDeptItems });
  }

  // 2. Global Operations & Approvals (Team Leader / Systems Admins)
  if (isTeamLeader || isSystemAdmin) {
      const globalApprovalItems = [
          { id: 'global-reports', label: 'Global Reports', icon: BarChart2, path: '/reports' },
          { id: 'global-assets', label: 'Global Assets', icon: Package, path: '/assets' },
          { id: 'global-schedules', label: 'Global Service Schedule', icon: Calendar, path: '/schedules' },
          { id: 'global-workplans', label: 'Review Workplans', icon: FileCheck, path: '/approvals/workplans' }
      ];
      
      // ONLY Team Leaders approve requisitions
      if (isTeamLeader) {
          globalApprovalItems.splice(1, 0, { id: 'global-requisitions', label: 'Requisitions Queue', icon: FileText, path: '/approvals/requisitions' });
      } else if (isSystemAdmin) {
          globalApprovalItems.splice(1, 0, { id: 'admin-requisitions', label: 'Global Requisitions', icon: FileText, path: '/approvals/adhoc-requisitions' });
      }

      sections.push({
          title: 'Global Approvals',
          items: globalApprovalItems
      });
  }

  // 3. Global Finance (Finance specific workers)
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
          title: 'Global Finance',
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

  const handleItemClick = () => { if (window.innerWidth < 768) onClose(); };

  return (
    <>
      <div className={`fixed top-0 left-0 h-screen w-64 bg-ministry-dark border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-2xl md:shadow-none`}>
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
