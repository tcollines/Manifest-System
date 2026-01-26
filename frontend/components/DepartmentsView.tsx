import React from 'react';
import DepartmentList from './DepartmentList';
import DepartmentRequests from './DepartmentRequests';


interface DepartmentsViewProps {
  currentUser: any;
}

const DepartmentsView: React.FC<DepartmentsViewProps> = ({ currentUser }) => {
  const isTeamLeader = currentUser?.role === 'TeamLeader';
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ministry-text mb-1">Departments</h1>
          <p className="text-gray-500">Manage ministry teams, view performance, and handle requests.</p>
        </div>
        <button className="bg-ministry-text text-white px-5 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-lg">
          + New Department
        </button>
      </div>

      <DepartmentList />

      {!isTeamLeader && (
        <div id="requests-section">
          <DepartmentRequests />
        </div>
      )}





    </div>
  );
};

export default DepartmentsView;