import React from 'react';
import { NavLink } from 'react-router-dom';

export interface ModuleTab {
  to: string;        // Absolute path, e.g. '/registration/check-in'
  label: string;
  icon?: React.ReactNode;
  hidden?: boolean;  // Allows role-based tab hiding without conditional array builds
}

interface ModuleTabsProps {
  tabs: ModuleTab[];
}

/**
 * ModuleTabs — shared NavLink-based tab bar for all module layouts.
 * Active state is derived from the URL via NavLink `isActive`, not from any useState.
 * Tabs with `hidden: true` are filtered before render (role-based access).
 */
export const ModuleTabs: React.FC<ModuleTabsProps> = ({ tabs }) => {
  const visibleTabs = tabs.filter(t => !t.hidden);

  return (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl overflow-x-auto scrollbar-hide">
      {visibleTabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            [
              'flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold',
              'transition-all whitespace-nowrap select-none',
              isActive
                ? 'bg-black text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/60',
            ].join(' ')
          }
        >
          {tab.icon && (
            <span className={`w-4 h-4 flex-shrink-0`}>{tab.icon}</span>
          )}
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </div>
  );
};
