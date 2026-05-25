import React from 'react';
import { Outlet } from 'react-router-dom';
import { Users, Map, Shield, LayoutList } from 'lucide-react';
import { ModuleTabs, ModuleTab } from '../../components/ui/ModuleTabs';
import { User } from '../../types';

interface SettingsLayoutProps {
  currentUser?: User | null;
}

const TABS: ModuleTab[] = [
  { to: '/settings/map',      label: 'Map',      icon: <Map size={16} /> },
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
    <div className="flex-1 w-full relative">
      <React.Suspense fallback={<div className="flex items-center justify-center h-full w-full min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div></div>}>
<Outlet />
</React.Suspense>
    </div>
  </div>
);

export default SettingsLayout;
