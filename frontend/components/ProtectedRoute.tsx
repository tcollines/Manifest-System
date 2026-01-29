import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { User } from '../types';

interface ProtectedRouteProps {
    currentUser: User | null;
    allowedDepartments?: string[]; // IDs like 'd1', 'd2'
    allowedRoles?: string[];
    bypassRoles?: string[]; // Roles that skip restricted checks (e.g. Logistics accessing reg)
    redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    currentUser,
    allowedDepartments = [],
    allowedRoles = [],
    bypassRoles = [],
    redirectPath = '/'
}) => {
    if (!currentUser) {
        return <Navigate to={redirectPath} replace />;
    }

    // 1. Super Admin / Administrator / TeamLeader bypass
    if (currentUser.role === 'Super Admin' || currentUser.role === 'Administrator' || currentUser.role === 'TeamLeader') {
        return <Outlet />;
    }

    // 1b. Specific Bypass Roles (e.g. Logistics role accessing Registration regardless of dept)
    if (bypassRoles.length > 0 && bypassRoles.includes(currentUser.role)) {
        return <Outlet />;
    }

    // 2. Department Check
    // If allowedDepartments is provided, user MUST be in one of them
    if (allowedDepartments.length > 0) {
        if (!currentUser.departmentId || !allowedDepartments.includes(currentUser.departmentId)) {
            // User is not in the allowed department
            console.warn(`Access Denied: User ${currentUser.username} (Dept: ${currentUser.departmentId}) attempted to access restricted route.`);
            return <Navigate to={redirectPath} replace />;
        }
    }

    // 3. Role Check
    // If allowedRoles is provided, user MUST have one of them
    if (allowedRoles.length > 0) {
        if (!allowedRoles.includes(currentUser.role)) {
            console.warn(`Access Denied: User ${currentUser.username} (Role: ${currentUser.role}) attempted to access restricted route.`);
            return <Navigate to={redirectPath} replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
