import React from 'react';
import { Outlet } from 'react-router-dom';
import { CheckCircle, Bus, Database } from 'lucide-react';
import { ModuleTabs, ModuleTab } from '../../components/ui/ModuleTabs';
import { User } from '../../types';

interface RegistrationLayoutProps {
  currentUser: User;
}

/**
 * RegistrationLayout — module shell for the Registration department.
 *
 * Responsibilities:
 *   - Render NavLink tab bar via ModuleTabs (URL-driven — no useState)
 *   - Render <Outlet /> for child route content
 *
 * Does NOT: fetch data, hold tab state, contain business logic.
 */
export const RegistrationLayout: React.FC<RegistrationLayoutProps> = ({ currentUser }) => {
  const isLogistics = currentUser.role === 'Logistics';

  const TABS: ModuleTab[] = [
    {
      to: '/registration/check-in',
      label: 'Service Check-In',
      icon: <CheckCircle size={16} />,
      hidden: isLogistics,
    },
    {
      to: '/registration/events',
      label: 'Events & Logistics',
      icon: <Bus size={16} />,
    },
    {
      to: '/registration/database',
      label: 'Database',
      icon: <Database size={16} />,
      hidden: isLogistics,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Module Header */}
      <div className="px-4 md:px-8 pt-6 pb-0 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-ministry-text">
          {isLogistics ? 'Logistics Entry' : 'Registration Dashboard'}
        </h1>
        <p className="text-sm text-ministry-muted mt-1">
          {isLogistics
            ? 'Manage vehicles and passengers for your station.'
            : 'Manage event registration, stations, and member database.'}
        </p>

        {/* NavLink Tab Bar — active state driven by URL, no useState */}
        <div className="mt-4 pb-0">
          <ModuleTabs tabs={TABS} />
        </div>
      </div>

      {/* Child Route Content */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <Outlet />
      </div>
    </div>
  );
};

export default RegistrationLayout;
