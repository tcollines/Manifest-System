import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import DepartmentList from './DepartmentList';
import CreateDepartmentModal from '../modules/generic-dept/CreateDepartmentModal';
import { getDashboardForUser } from '../utils';

interface DepartmentsViewProps {
  currentUser: any;
}

const DepartmentsView: React.FC<DepartmentsViewProps> = ({ currentUser }) => {
  const isTeamLeader = currentUser?.role === 'TeamLeader';
  const isAdmin = ['Administrator', 'Super Admin'].includes(currentUser?.role);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  if (!isTeamLeader && !isAdmin) {
      return <Navigate to={getDashboardForUser(currentUser)} replace />;
  }

  const handleCreated = (deptId: string) => {
    setShowModal(false);
    navigate(`/departments/${deptId}/dashboard`);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ministry-text mb-1">Departments</h1>
          <p className="text-gray-500">Manage ministry teams, view performance, and handle requests.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-ministry-text text-white px-5 py-2.5 rounded-xl font-medium hover:bg-ministry-orange transition-colors shadow-lg"
        >
          + New Department
        </button>
      </div>

      <DepartmentList />

      {showModal && (
        <CreateDepartmentModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};

export default DepartmentsView;