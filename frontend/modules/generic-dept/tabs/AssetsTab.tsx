import React from 'react';
import { Department, User } from '../../../types';
import { DeptRole } from '../../../shared/enums';
import { AssetsTab as AssetsView } from '../../../components/AssetsTab';

interface Props { department: Department; user: User | null; deptRole: DeptRole | null; systemRole: any; }

/**
 * AssetsTab — embeds the shared AssetsTab component pre-filtered to this department.
 * Admins can optionally clear the filter; dept users see only their department's assets.
 */
const AssetsTab: React.FC<Props> = ({ department, user }) => {
    if (!user) return null;
    return <AssetsView currentUser={user} departmentId={department.id} />;
};

export default AssetsTab;
