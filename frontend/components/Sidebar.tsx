
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Bus, PlusSquare, FileText, ClipboardList, Map, BookOpen, Clock, FileCheck, Phone, CheckCircle, Package, Search, Menu, X, Settings, Heart, Database, BarChart2, Briefcase, GraduationCap, ArrowRight, UserPlus, CreditCard, Building2, DollarSign, ClipboardCheck, Baby, Car, Globe, LogOut } from 'lucide-react';
import { ModalType, User, Department } from '../types';

interface SidebarProps {
  currentUser: User;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUser, onLogout, isOpen, onClose }) => {
  const location = useLocation();
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

    // 1. Direct matches
    if (
      currentUser.departmentUid === targetDeptId ||
      currentUser.departmentId === slugOrCode ||
      currentUser.departmentId === targetDeptId
    ) {
      return true;
    }

    // 2. Legacy Code match (e.g. user.departmentId === 'd2' vs dept.code === 'd2')
    const resolvedDept = departments.find(d => d.id === targetDeptId);
    if (resolvedDept && resolvedDept.code && currentUser.departmentId === resolvedDept.code) {
      return true;
    }

    return false;
  };

  // ÔöÇÔöÇÔöÇ Dept Detection ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Uses ONLY checkCode (reads currentUser directly ÔÇö never flickers on API load).
  // checkDept is reserved for building paths, never for detecting which menu to show.

  const checkCode = (...codes: string[]) =>
    codes.some(c => currentUser.departmentId === c || currentUser.departmentUid === c);

  const roleHOD  = currentUser.role === 'Head of Dept' || currentUser.role === 'HOD' || currentUser.role === 'Dept Admin';
  const roleAdminOrFinance = roleHOD || currentUser.role === 'Dept Finance';
  const roleNG   = ['Head of Dept','HOD','Dept Admin','Dept Finance','Staff','Member','Volunteer'].includes(currentUser.role);

  const isRegistrationHead   = roleAdminOrFinance  && checkCode('d1', 'registration');
  const isNextGenHead        = roleNG   && checkCode('d2', 'next-gen');
  const isParkingHead        = roleAdminOrFinance  && checkCode('d4', 'parking');
  const isFinanceHead        = roleAdminOrFinance  && checkCode('d3', 'finance');
  const isTransportationHead = roleAdminOrFinance  && checkCode('d5', 'transportation', '4630e48a-f97e-48fd-a901-864b591c282f');
  const isSchoolsHead        = roleAdminOrFinance  && checkCode('d7', 'schools');
  const isHealingHead        = ['Head of Dept','HOD','Dept Admin','Dept Finance','Staff'].includes(currentUser.role) && checkCode('d8', 'healing');
  const isFollowUpHead       = roleAdminOrFinance  && checkCode('d6', 'follow-up');
  const isFollowUpMember     = currentUser.role === 'Member' && checkCode('d6', 'follow-up');
  const isCampusHead         = roleAdminOrFinance  && checkCode('d9', 'campus', 'campus and institutions');
  const isStageCoordinator   = (currentUser.role === 'Stage Coordinator' || currentUser.role === 'Coordinator') && !!currentUser.stationId;
  const isVehicleCoordinator = (currentUser.role === 'Vehicle Coordinator' || currentUser.role === 'Coordinator') && !currentUser.stationId;
  const isLogisticsEntrant   = currentUser.role === 'Logistics';
  const isTeamLeader         = currentUser.role === 'TeamLeader';
  const isResidentCoordinator = currentUser.role === 'Resident Coordinator';

  const isRegistrationMember = !isRegistrationHead && checkCode('d1', 'registration') &&
    ['Member', 'Staff', 'Volunteer'].includes(currentUser.role);
  const isParkingMember = !isParkingHead && checkCode('d4', 'parking') &&
    ['Member', 'Staff', 'Volunteer'].includes(currentUser.role);
  const isNextGenMember = !isNextGenHead && checkCode('d2', 'next-gen') &&
    ['Member', 'Staff', 'Volunteer'].includes(currentUser.role);

  // Any dept user not matched by a hardcoded slug/code above ÔåÆ custom or old-dept with UUID stored.
  // UUID regex stays stable; isCustomDeptUser never flips when departments API responds.
  const isKnownOldDept =
    isRegistrationHead || isRegistrationMember ||
    isNextGenHead      || isNextGenMember      ||
    isParkingHead      || isParkingMember      ||
    isFinanceHead      || isTransportationHead || isSchoolsHead || isHealingHead ||
    isFollowUpHead     || isFollowUpMember     || isCampusHead  || isStageCoordinator ||
    isResidentCoordinator || isVehicleCoordinator || isLogisticsEntrant || isTeamLeader;

  const isCustomDeptUser =
    !isKnownOldDept &&
    !!currentUser.departmentId &&
    ['Head of Dept', 'HOD', 'Dept Admin', 'Dept Finance', 'Member'].includes(currentUser.role);

  // ÔöÇÔöÇÔöÇ Path resolution ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // For old depts: resolves the UUID once departments API loads; falls back to
  // departmentUid, then departmentId (may be a legacy code like 'd1' until loaded).
  const resolveDeptId = (slug: string) =>
    getDeptId(slug) ?? currentUser.departmentUid ?? currentUser.departmentId;

  let menuItems: any[] = [];

  // Schools Head Menu
  if (isSchoolsHead) {
    const dId = resolveDeptId('schools');
    menuItems = [
      { id: 'schools',        label: 'Schools Dashboard',  icon: BookOpen,      path: `/departments/${dId}` },
      { id: 's-team',         label: 'Team Management',    icon: Users,         path: `/departments/${dId}/dashboard?tab=team` },
      { id: 's-schedule',     label: 'Service Schedule',   icon: Calendar,      path: `/departments/${dId}/dashboard?tab=schedule` },
      { id: 's-workplans',    label: 'Monthly Workplans',  icon: ClipboardList, path: `/departments/${dId}/dashboard?tab=workplans` },
      { id: 's-requisitions', label: 'Requisitions',       icon: FileText,      path: '/requisitions' },
      { id: 's-assets',       label: 'Assets',             icon: Package,       path: '/assets' },
      { id: 's-finances',     label: 'Dept Finances',      icon: CreditCard,    path: `/departments/${dId}/dashboard?tab=finances` },
      { id: 's-reports',      label: 'Monthly Reports',    icon: BarChart2,     path: '/reports' },
    ];
  } else if (isRegistrationHead) {
    const dId = resolveDeptId('registration');
    menuItems = [
      { id: 'registration',   label: 'Registration Dashboard', icon: ClipboardCheck, path: `/departments/${dId}` },
      { id: 'r-events',       label: 'Service Check In',       icon: ClipboardCheck, path: `/departments/${dId}/check-in` },
      { id: 'r-team',         label: 'Team Management',        icon: Users,          path: `/departments/${dId}/dashboard?tab=team` },
      { id: 'r-schedule',     label: 'Service Schedule',       icon: Calendar,       path: `/departments/${dId}/dashboard?tab=schedule` },
      { id: 'r-workplans',    label: 'Monthly Workplans',      icon: ClipboardList,  path: `/departments/${dId}/dashboard?tab=workplans` },
      { id: 'r-requisitions', label: 'Requisitions',           icon: FileText,       path: '/requisitions' },
      { id: 'r-assets',       label: 'Assets',                 icon: Package,        path: '/assets' },
      { id: 'r-finances',     label: 'Dept Finances',          icon: CreditCard,     path: `/departments/${dId}/dashboard?tab=finances` },
      { id: 'r-reports',      label: 'Monthly Reports',        icon: BarChart2,      path: '/reports' },
    ];
  } else if (isRegistrationMember) {
    const dId = resolveDeptId('registration');
    menuItems = [
      { id: 'registration',   label: 'Registration Dashboard', icon: ClipboardCheck, path: `/departments/${dId}` },
      { id: 'r-events',       label: 'Service Check In',       icon: ClipboardCheck, path: `/departments/${dId}/check-in` },
    ];
  } else if (isNextGenHead) {
    const dId = resolveDeptId('next-gen');
    menuItems = [
      { id: 'next-gen',            label: 'Next Gen Dashboard',  icon: Baby,          path: `/departments/${dId}` },
      { id: 'ng-checkin',          label: 'Service Check In',    icon: CheckCircle,   path: `/departments/${dId}/checkin` },
      { id: 'ng-checkout',         label: 'Check Out',           icon: ArrowRight,    path: `/departments/${dId}/checkout` },
      { id: 'next-gen-follow-up',  label: 'Follow Up',           icon: UserPlus,      path: `/departments/${dId}/follow-up` },
      { id: 'next-gen-reports',    label: 'Stats Reports',       icon: BarChart2,     path: `/departments/${dId}/reports` },
      { id: 'events',              label: 'Events & Services',   icon: Calendar,      path: '/events' },
      { id: 'next-gen-team',       label: 'Volunteer Team',      icon: Users,         path: `/departments/${dId}/team` },
      { id: 'ng-team',             label: 'Team Management',     icon: Users,         path: `/departments/${dId}/dashboard?tab=team` },
      { id: 'ng-schedule',         label: 'Service Schedule',    icon: Calendar,      path: `/departments/${dId}/dashboard?tab=schedule` },
      { id: 'ng-workplans',        label: 'Monthly Workplans',   icon: ClipboardList, path: `/departments/${dId}/dashboard?tab=workplans` },
      { id: 'ng-requisitions',     label: 'Requisitions',        icon: FileText,      path: '/requisitions' },
      { id: 'ng-assets',           label: 'Assets',              icon: Package,       path: '/assets' },
      { id: 'ng-finances',         label: 'Dept Finances',       icon: CreditCard,    path: `/departments/${dId}/dashboard?tab=finances` },
      { id: 'reports',             label: 'Monthly Reports',     icon: BarChart2,     path: '/reports' },
    ];
    // Staff: no reports, no team management, no admin items
    if (currentUser.role === 'Staff') {
      menuItems = menuItems.filter(i => !['reports', 'next-gen-reports', 'ng-team', 'ng-requisitions', 'ng-assets'].includes(i.id));
    }
    // Member/Volunteer: only check-in, check-out, and follow-up
    if (currentUser.role === 'Member' || currentUser.role === 'Volunteer') {
      menuItems = menuItems.filter(i => ['next-gen', 'ng-checkin', 'ng-checkout', 'next-gen-follow-up'].includes(i.id));
    }

  } else if (isNextGenMember) {
    const dId = resolveDeptId('next-gen');
    menuItems = [
      { id: 'next-gen',           label: 'Next Gen Dashboard', icon: Baby,        path: `/departments/${dId}` },
      { id: 'next-gen-check-in',  label: 'Service Check In',   icon: CheckCircle, path: `/departments/${dId}/checkin` },
      { id: 'next-gen-check-out', label: 'Check Out',          icon: ArrowRight,  path: `/departments/${dId}/checkout` },
    ];
  } else if (isParkingHead) {
    const dId = resolveDeptId('parking');
    menuItems = [
      { id: 'parking',        label: 'Parking Dashboard',   icon: Car,           path: `/departments/${dId}` },
      { id: 'p-checkin',      label: 'Service Check In',    icon: CheckCircle,   path: `/departments/${dId}/checkin` },
      { id: 'p-team',         label: 'Team Management',     icon: Users,         path: `/departments/${dId}/dashboard?tab=team` },
      { id: 'p-schedule',     label: 'Service Schedule',    icon: Calendar,      path: `/departments/${dId}/dashboard?tab=schedule` },
      { id: 'p-workplans',    label: 'Monthly Workplans',   icon: ClipboardList, path: `/departments/${dId}/dashboard?tab=workplans` },
      { id: 'p-requisitions', label: 'Requisitions',        icon: FileText,      path: '/requisitions' },
      { id: 'p-assets',       label: 'Assets',              icon: Package,       path: '/assets' },
      { id: 'p-finances',     label: 'Dept Finances',       icon: CreditCard,    path: `/departments/${dId}/dashboard?tab=finances` },
      { id: 'p-reports',      label: 'Monthly Reports',     icon: BarChart2,     path: '/reports' },
    ];
  } else if (isParkingMember) {
    const dId = resolveDeptId('parking');
    menuItems = [
      { id: 'parking',          label: 'Parking Dashboard', icon: Car,         path: `/departments/${dId}` },
      { id: 'parking-check-in', label: 'Service Check In',  icon: CheckCircle, path: `/departments/${dId}/checkin` },
    ];
  } else if (isTransportationHead) {
    const dId = resolveDeptId('transportation');
    menuItems = [
      { id: 'transportation',   label: 'Transportation Dashboard', icon: Bus,           path: `/departments/${dId}` },
      { id: 't-team',           label: 'Team Management',          icon: Users,         path: `/departments/${dId}/dashboard?tab=team` },
      { id: 't-schedule',       label: 'Service Schedule',         icon: Calendar,      path: `/departments/${dId}/dashboard?tab=schedule` },
      { id: 't-workplans',      label: 'Monthly Workplans',        icon: ClipboardList, path: `/departments/${dId}/dashboard?tab=workplans` },
      { id: 't-requisitions',   label: 'Requisitions',             icon: FileText,      path: '/requisitions' },
      { id: 't-assets',         label: 'Assets',                   icon: Package,       path: '/assets' },
      { id: 't-finances',       label: 'Dept Finances',            icon: CreditCard,    path: `/departments/${dId}/dashboard?tab=finances` },
      { id: 't-reports',        label: 'Monthly Reports',          icon: BarChart2,     path: '/reports' },
    ];
  } else if (isFinanceHead) {
    const dId = resolveDeptId('finance');
    menuItems = [
      { id: 'finance',        label: 'Finance Dashboard', icon: CreditCard,    path: `/departments/${dId}` },
      { id: 'f-team',         label: 'Team Management',   icon: Users,         path: `/departments/${dId}/dashboard?tab=team` },
      { id: 'f-schedule',     label: 'Service Schedule',  icon: Calendar,      path: `/departments/${dId}/dashboard?tab=schedule` },
      { id: 'f-workplans',    label: 'Monthly Workplans', icon: ClipboardList, path: `/departments/${dId}/dashboard?tab=workplans` },
      { id: 'f-requisitions', label: 'Requisitions',      icon: FileText,      path: '/requisitions' },
      { id: 'f-assets',       label: 'Assets',            icon: Package,       path: '/assets' },
      { id: 'f-finances',     label: 'Dept Finances',     icon: CreditCard,    path: `/departments/${dId}/dashboard?tab=finances` },
      { id: 'f-reports',      label: 'Monthly Reports',   icon: BarChart2,     path: '/reports' },
    ];
  } else if (isHealingHead) {
    const dId = resolveDeptId('healing');
    menuItems = [
      { id: 'healing',        label: 'Healing Dept',      icon: Heart,         path: `/departments/${dId}` },
      { id: 'h-team',         label: 'Team Management',   icon: Users,         path: `/departments/${dId}/dashboard?tab=team` },
      { id: 'h-schedule',     label: 'Service Schedule',  icon: Calendar,      path: `/departments/${dId}/dashboard?tab=schedule` },
      { id: 'h-workplans',    label: 'Monthly Workplans', icon: ClipboardList, path: `/departments/${dId}/dashboard?tab=workplans` },
      { id: 'h-requisitions', label: 'Requisitions',      icon: FileText,      path: '/requisitions' },
      { id: 'h-assets',       label: 'Assets',            icon: Package,       path: '/assets' },
      { id: 'h-finances',     label: 'Dept Finances',     icon: CreditCard,    path: `/departments/${dId}/dashboard?tab=finances` },
      { id: 'h-reports',      label: 'Monthly Reports',   icon: BarChart2,     path: '/reports' },
    ];
    if (currentUser.role === 'Staff') {
      menuItems = menuItems.filter(i => ['healing', 'h-schedule'].includes(i.id));
    }
  } else if (isFollowUpHead) {
    const dId = resolveDeptId('follow-up');
    menuItems = [
      { id: 'follow-up',       label: 'Follow Up Dashboard', icon: UserPlus,      path: `/departments/${dId}` },
      { id: 'fu-team',         label: 'Team Management',     icon: Users,         path: `/departments/${dId}/dashboard?tab=team` },
      { id: 'fu-schedule',     label: 'Service Schedule',    icon: Calendar,      path: `/departments/${dId}/dashboard?tab=schedule` },
      { id: 'fu-workplans',    label: 'Monthly Workplans',   icon: ClipboardList, path: `/departments/${dId}/dashboard?tab=workplans` },
      { id: 'fu-requisitions', label: 'Requisitions',        icon: FileText,      path: '/requisitions' },
      { id: 'fu-assets',       label: 'Assets',              icon: Package,       path: '/assets' },
      { id: 'fu-finances',     label: 'Dept Finances',       icon: CreditCard,    path: `/departments/${dId}/dashboard?tab=finances` },
      { id: 'fu-reports',      label: 'Monthly Reports',     icon: BarChart2,     path: '/reports' },
    ];
  } else if (isFollowUpMember) {
    menuItems = [
      { id: 'follow-up', label: 'Follow Up Dashboard', icon: UserPlus },
    ];
  } else if (isCampusHead) {
    const dId = resolveDeptId('campus');
    menuItems = [
      { id: 'campus',          label: 'Campus Dashboard',     icon: Building2,     path: `/departments/${dId}` },
      { id: 'campus-events',   label: 'Ministry Events',      icon: Calendar,      path: `/departments/${dId}/events` },
      { id: 'ca-team',         label: 'Team Management',      icon: Users,         path: `/departments/${dId}/dashboard?tab=team` },
      { id: 'ca-schedule',     label: 'Service Schedule',     icon: Calendar,      path: `/departments/${dId}/dashboard?tab=schedule` },
      { id: 'ca-workplans',    label: 'Monthly Workplans',    icon: ClipboardList, path: `/departments/${dId}/dashboard?tab=workplans` },
      { id: 'ca-requisitions', label: 'Requisitions',         icon: FileText,      path: '/requisitions' },
      { id: 'ca-assets',       label: 'Assets',               icon: Package,       path: '/assets' },
      { id: 'campus-finance',  label: 'Dept Finances',        icon: DollarSign,    path: `/departments/${dId}/finance` },
      { id: 'ca-reports',      label: 'Monthly Reports',      icon: BarChart2,     path: '/reports' },
    ];
  } else if (isStageCoordinator) {
    menuItems = [
      { id: 'stage-dashboard', label: 'Stage Dashboard', icon: Bus },
    ];
  } else if (isResidentCoordinator) {
    menuItems = [
      { id: 'residents', label: 'Residents Dashboard', icon: Building2 },
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
      { id: 'administration-team', label: 'Team Management', icon: Users, path: '/administration?tab=schedules' },
      { id: 'events', label: 'Events & Services', icon: Calendar },
      { id: 'reports', label: 'Reports', icon: BarChart2 },
      { id: 'requisitions', label: 'Requisitions', icon: FileText },
      { id: 'assets', label: 'Assets', icon: Package },
      { id: 'manifest-settings', label: 'Manifest Settings', icon: Map }, // Extra Tab
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
  }

  const customDeptId = currentUser.departmentId;
  const isCustomFinance = currentUser.role === 'Dept Finance';
  const isCustomAdmin = currentUser.role === 'Head of Dept' || currentUser.role === 'HOD' || currentUser.role === 'Dept Admin';

  if (isCustomDeptUser) {
    // Resolve the dept slug from the API-loaded list (available because departments API
    // is already fetched in this sidebar's useEffect).  This lets us inject the
    // old-dept service check-in link even when the user's departmentId is a UUID.
    const userDept     = departments.find(d => d.id === customDeptId);
    const userDeptSlug = userDept?.slug ?? '';

    // Map known old-dept slugs to their service check-in routes
    const CHECKIN_ROUTES: Record<string, string> = {
      'registration': '/registration/check-in',
      'parking':      '/parking/checkin',
      'next-gen':     '/next-gen/checkin',
    };
    const checkinPath = CHECKIN_ROUTES[userDeptSlug];

    // Build check-in item for above-the-fold placement (only for admins)
    const checkinItem = checkinPath && isCustomAdmin
      ? [{ id: 'custom-checkin', label: 'Service Check In', icon: ClipboardCheck, path: checkinPath }]
      : [];

    menuItems = [
      ...(isCustomAdmin ? [
        { id: 'custom-dashboard',    label: 'Overview',           icon: LayoutDashboard, path: `/departments/${customDeptId}/dashboard` },
        ...checkinItem,
        { id: 'custom-team',         label: 'Team Management',    icon: Users,           path: `/departments/${customDeptId}/dashboard?tab=team` },
        { id: 'custom-schedule',     label: 'Service Schedule',   icon: Calendar,        path: `/departments/${customDeptId}/dashboard?tab=schedule` },
        { id: 'custom-requisitions', label: 'Requisitions',       icon: FileText,        path: `/departments/${customDeptId}/dashboard?tab=requisitions` },
        { id: 'custom-workplans',    label: 'Monthly Workplans',  icon: ClipboardList,   path: `/departments/${customDeptId}/dashboard?tab=workplans` },
        { id: 'custom-finances',     label: 'Dept Finances',      icon: CreditCard,      path: `/departments/${customDeptId}/dashboard?tab=finances` },
        { id: 'custom-assets',       label: 'Assets',             icon: Package,         path: `/departments/${customDeptId}/dashboard?tab=assets` },
        { id: 'custom-reports',      label: 'Monthly Reports',    icon: BarChart2,       path: `/departments/${customDeptId}/dashboard?tab=reports` },
        { id: 'custom-settings',     label: 'Settings',           icon: Settings,        path: '/settings' },
      ] : [
        // Finance-role sees dashboard + finances + workplans + requisitions + assets + schedule (= all Member tabs + finance tabs)

        { id: 'custom-dashboard',    label: 'Overview',           icon: LayoutDashboard, path: `/departments/${customDeptId}/dashboard` },
        { id: 'custom-finances',     label: 'Dept Finances',      icon: CreditCard,      path: `/departments/${customDeptId}/dashboard?tab=finances` },
        { id: 'custom-workplans',    label: 'Monthly Workplans',  icon: ClipboardList,   path: `/departments/${customDeptId}/dashboard?tab=workplans` },
        { id: 'custom-requisitions', label: 'Requisitions',       icon: FileText,        path: `/departments/${customDeptId}/dashboard?tab=requisitions` },
        { id: 'custom-assets',       label: 'Assets',             icon: Package,         path: `/departments/${customDeptId}/dashboard?tab=assets` },
        { id: 'custom-schedule',     label: 'Service Schedule',   icon: Calendar,        path: `/departments/${customDeptId}/dashboard?tab=schedule` },
        { id: 'custom-settings',     label: 'Settings',           icon: Settings,        path: '/settings' },
      ]),
    ];
  } else if (menuItems.length === 0) {
    // Only falls here for Super Admin / Administrator ÔÇö no dept-specific menu was set above
    const allMenuItems = [
      { id: 'dashboard',         label: 'Dashboard',         icon: LayoutDashboard, roles: ['Administrator', 'Super Admin', 'Head of Dept', 'Staff', 'Volunteer'], path: '/dashboard' },
      { id: 'departments',       label: 'Departments',       icon: Users,           roles: ['Administrator', 'Super Admin'],                                        path: '/departments' },
      { id: 'administration-team', label: 'Team Management', icon: Users, roles: ['Administrator', 'Super Admin'], path: '/administration?tab=schedules' },
      { id: 'events',            label: 'Events & Services', icon: Calendar,        roles: ['Administrator', 'Super Admin', 'Head of Dept', 'Staff'],               path: '/events' },
      { id: 'reports',           label: 'Reports',           icon: BarChart2,       roles: ['Administrator', 'Super Admin', 'Head of Dept'],                        path: '/reports' },
      { id: 'requisitions',      label: 'Requisitions',      icon: FileText,        roles: ['Administrator', 'Super Admin', 'Head of Dept', 'Staff'],               path: '/requisitions' },
      { id: 'assets',            label: 'Assets',            icon: Package,         roles: ['Administrator', 'Super Admin', 'Head of Dept'],                        path: '/assets' },
      { id: 'settings',          label: 'Settings',          icon: Settings,        roles: ['Administrator', 'Super Admin', 'Head of Dept', 'Staff', 'Volunteer'],  path: '/settings' },
    ];
    menuItems = allMenuItems.filter(item => {
      if (currentUser.role === 'Administrator' || currentUser.role === 'Super Admin') return true;
      return item.roles.includes(currentUser.role);
    });
  }

  // Globally strip out team and reports tabs for Dept Finance
  if (currentUser.role === 'Dept Finance') {
    menuItems = menuItems.filter(i => !i.id.includes('team') && !i.id.includes('report'));
  }

  // ÔöÇÔöÇÔöÇ Add Settings to every old-dept menu that doesn't already have it ÔöÇÔöÇÔöÇÔöÇ
  const hasSettings = menuItems.some(i => i.id === 'settings' || i.id.endsWith('-settings'));
  if (!hasSettings && menuItems.length > 0 && !isCustomDeptUser) {
    menuItems = [
      ...menuItems,
      { id: 'dept-settings', label: 'Settings', icon: Settings, path: '/settings' },
    ];
  }


  const getPath = (id: string) => {
    switch (id) {
      case 'dashboard': return '/dashboard';
      case 'team-dashboard': return '/team-dashboard';
      case 'administration': return '/administration';
      case 'departments': return '/departments';
      case 'events': return '/events';
      case 'reports': return '/reports';
      case 'requisitions': return '/requisitions';
      case 'assets': return '/assets';
      case 'manifest-settings': return '/manifest-settings';
      case 'settings': return '/settings';
      case 'registration': return '/registration';
      case 'r-events': return '/registration/check-in';
      case 'next-gen': return '/next-gen';
      case 'ng-checkin': return '/next-gen/checkin';
      case 'ng-checkout': return '/next-gen/checkout';
      case 'next-gen-check-in': return '/next-gen/checkin';
      case 'next-gen-check-out': return '/next-gen/checkout';
      case 'next-gen-follow-up': return '/next-gen-follow-up';
      case 'next-gen-team': return '/next-gen-team';
      case 'next-gen-reports': return '/next-gen-reports';
      case 'parking': return '/parking';
      case 'p-checkin': return '/parking/checkin';
      case 'parking-check-in': return '/parking/checkin';
      case 'finance': return '/finance';
      case 'transportation': return '/transportation';
      case 'schools': return '/schools';
      case 'follow-up': return '/follow-up';
      case 'healing': return '/healing';
      case 'campus': return '/campus';
      case 'campus-events': return '/campus/events';
      case 'campus-finance': return '/campus/finance';
      case 'stage-dashboard': return '/stage-dashboard';
      case 'residents': return '/residents';
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

            // For custom dept items with ?tab= params, manually compare path+tab
            // NavLink isActive only checks the pathname, not query params
            const isCustomDeptItem = !!item.path && item.path.includes('/departments/') && item.path.includes('?tab=');
            let isActiveItem = false;
            if (isCustomDeptItem) {
              const [itemPath, itemQuery] = path.split('?');
              const itemTab = new URLSearchParams(itemQuery).get('tab');
              const currentTab = new URLSearchParams(location.search).get('tab');
              isActiveItem = location.pathname === itemPath && (itemTab ? currentTab === itemTab : !currentTab);
            } else if (item.path && item.path.includes('/departments/') && !item.path.includes('?')) {
              // Overview link: /departments/:id/dashboard with NO tab param
              isActiveItem = location.pathname === path && !new URLSearchParams(location.search).get('tab');
            }

            return (
              <NavLink
                key={item.id}
                to={path}
                end
                onClick={handleItemClick}
                className={({ isActive }) => {
                  const active = isCustomDeptItem || (item.path && item.path.includes('/departments/'))
                    ? isActiveItem
                    : isActive;
                  return `w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
                    ? 'bg-ministry-neon text-black font-semibold shadow-md'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`;
                }}
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
