import React from 'react';
import { Outlet } from 'react-router-dom';
import { Users, Map, Shield, LayoutList } from 'lucide-react';
import { ModuleTabs, ModuleTab } from '../../components/ui/ModuleTabs';
import { User } from '../../types';

interface SettingsLayoutProps {
  currentUser?: User | null;
}

const TABS: ModuleTab[] = [
  { to: '/settings/users',    label: 'Users',    icon: <Users size={16} /> },
  { to: '/settings/map',      label: 'Map',      icon: <Map size={16} /> },
  { to: '/settings/profile',  label: 'Profile',  icon: <Shield size={16} /> },
  { to: '/settings/manifest', label: 'Manifest', icon: <LayoutList size={16} /> },
];

export const SettingsLayout: React.FC<SettingsLayoutProps> = () => (
  <div className="flex flex-col h-full">
    <div className="px-4 md:px-8 pt-6 pb-0 bg-white border-b border-gray-100">
      <h1 className="text-2xl font-bold text-ministry-text">System Settings</h1>
      <p className="text-sm text-ministry-muted mt-1">Manage users, map coordinates, your profile, and system manifest</p>
      <div className="mt-4 pb-0">
        <ModuleTabs tabs={TABS} />
      </div>
    </div>
    <div className="flex-1 overflow-y-auto w-full h-full relative">
      <Outlet />
    </div>
  </div>
);

export default SettingsLayout;
