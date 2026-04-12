import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Users } from 'lucide-react';
import { ModalType } from '../../types';
import AdministrationUsersPage from './AdministrationUsersPage';
import AdministrationSchedulesPage from './AdministrationSchedulesPage';

interface Props {
  openModal: (t: ModalType) => void;
  onDeleteUser: (id: string) => void;
  onEditUser: (u: any) => void;
}

const AdministrationDashboard: React.FC<Props> = (props) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'schedules';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-ministry-text mb-1">Team Management</h1>
        <p className="text-gray-500">Manage global service schedules and system users.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl w-max border border-gray-200 shadow-sm">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'schedules'
              ? 'bg-white text-ministry-orange shadow-sm font-semibold'
              : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>System Schedules</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'users'
              ? 'bg-white text-ministry-orange shadow-sm font-semibold'
              : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>System Users</span>
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'schedules' && (
           <div className="animate-in fade-in duration-300">
             <AdministrationSchedulesPage />
           </div>
        )}
        {activeTab === 'users' && (
           <div className="animate-in fade-in duration-300">
             <AdministrationUsersPage {...props} />
           </div>
        )}
      </div>
    </div>
  );
};

export default AdministrationDashboard;
