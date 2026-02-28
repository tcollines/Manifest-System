
import React from 'react';
import { User, MonitoringReport } from '../types';
import AdminReportsView from './AdminReportsView';
import MyReportsView from './MyReportsView';

interface ReportsDashboardProps {
    user: User;
}

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ user }) => {
    const isAdmin = ['Super Admin', 'Administrator', 'TeamLeader'].includes(user.role);
    const isHoD = user.role === 'Head of Dept' || user.role === 'Dept Admin';

    if (isAdmin) {
        return <AdminReportsView user={user} />;
    }

    if (isHoD) {
        return <MyReportsView user={user} />;
    }

    return (
        <div className="p-6 text-center text-gray-500">
            You do not have access to this module.
        </div>
    );
};

export default ReportsDashboard;
