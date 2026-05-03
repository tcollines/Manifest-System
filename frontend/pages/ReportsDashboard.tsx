
import React from 'react';
import { User, MonitoringReport } from '../types';
import AdminReportsView from './AdminReportsView';
import MyReportsView from './MyReportsView';

interface ReportsDashboardProps {
    user: User;
    isGlobal?: boolean;
}

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ user, isGlobal = true }) => {
    // If they are on the global page, and they have global rights, show the Admin Builder/Monitor
    const isAdmin = ['Super Admin', 'Administrator', 'TeamLeader'].includes(user.role);
    if (isAdmin && isGlobal) {
        return <AdminReportsView user={user} />;
    }

    // Otherwise (even for Admins in 'My Dept' view), show the Department Filler view
    return <MyReportsView user={user} />;
};

export default ReportsDashboard;
