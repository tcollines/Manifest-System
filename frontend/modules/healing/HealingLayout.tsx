import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, FileText, Users, HeartHandshake, Plus } from 'lucide-react';

const HEALING_TABS = [
  { id: 'overview', label: 'Overview', icon: <Shield className="w-4 h-4" /> },
  { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
  { id: 'souls', label: 'Souls Won', icon: <Users className="w-4 h-4" /> },
  { id: 'testimonies', label: 'Testimonies', icon: <HeartHandshake className="w-4 h-4" /> },
];

const HealingLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <Outlet />
      </div>
    </div>
  );
};

export default HealingLayout;
