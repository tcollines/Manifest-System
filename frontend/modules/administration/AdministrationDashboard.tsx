import React from 'react';
import { ModalType } from '../../types';
import AdministrationUsersPage from './AdministrationUsersPage';

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
        <h1 className="text-3xl font-bold text-ministry-text mb-1">System Users</h1>
        <p className="text-gray-500">Manage system access and global user accounts.</p>
      </div>

      {/* Content */}
      <div className="mt-6">
        <AdministrationUsersPage {...props} />
      </div>
    </div>
  );
};

export default AdministrationDashboard;
