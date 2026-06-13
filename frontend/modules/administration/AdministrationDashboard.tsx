import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ModalType } from '../../types';
import AdministrationUsersPage from './AdministrationUsersPage';
import AdministrationEventsHighlights from './AdministrationEventsHighlights';
import { ModuleTabs } from '../../components/ui/ModuleTabs';
import { Users, Calendar } from 'lucide-react';

interface Props {
  openModal: (t: ModalType) => void;
  onDeleteUser: (id: string) => void;
  onEditUser: (u: any) => void;
  refreshTrigger?: number;
}

const AdministrationDashboard: React.FC<Props> = (props) => {
  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-ministry-text mb-1">Administration Dashboard</h1>
        <p className="text-gray-500">Manage system access and view global event highlights.</p>
      </div>

      <ModuleTabs
        tabs={[
          { to: '/administration/users', label: 'System Users', icon: <Users size={16} /> },
          { to: '/administration/events-highlights', label: 'Events Highlights', icon: <Calendar size={16} /> }
        ]}
      />

      {/* Content */}
      <div className="mt-6 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
        <Routes>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<AdministrationUsersPage {...props} />} />
          <Route path="events-highlights" element={<AdministrationEventsHighlights />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdministrationDashboard;
