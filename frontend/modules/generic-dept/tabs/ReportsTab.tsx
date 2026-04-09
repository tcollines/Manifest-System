import React from 'react';
import { Department, User } from '../../../types';
import { DeptRole } from '../../../shared/enums';
import ReportsView from '../../../components/ReportsView';

interface Props { department: Department; user: User | null; deptRole: DeptRole | null; systemRole: any; }

/**
 * ReportsTab — embeds the shared ReportsView used on /reports.
 * Shows Reports Center with Monthly Department Reports and department report submission.
 */
const ReportsTab: React.FC<Props> = ({ user }) => {
    if (!user) return null;
    return <ReportsView currentUser={user} />;
};

export default ReportsTab;
