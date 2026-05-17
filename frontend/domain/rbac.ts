import { User } from '../types';
import { resolveDepartment } from '../constants/departmentMap';

export const hasLogisticsAccess = (user?: User | null): boolean => {
    if (!user) return false;
    const role = user.role?.trim().toLowerCase();
    return role === 'logistics' || resolveDepartment(user.departmentId || '')?.slug === 'transportation';
};

export const canDeleteLogistics = (user?: User | null): boolean => {
    if (!user) return false;
    return ['Head of Dept', 'Dept Admin', 'Administrator', 'Super Admin'].includes(user.role || '');
};

export const hasElevatedRegistrationRole = (user?: User | null): boolean => {
    if (!user) return false;
    return ['Administrator', 'Super Admin', 'Head of Dept', 'Department Head', 'Dept Admin', 'Reg. Admin', 'Registration Admin', 'Registration Head'].includes(user.role || '');
};

export const canCreateService = (user?: User | null): boolean => {
    if (!user) return false;
    return ['Administrator', 'Super Admin', 'Head of Dept', 'Dept Admin', 'Reg. Admin'].includes(user.role || '');
};

export const isTeamLeader = (user?: User | null): boolean => {
    return user?.role === 'TeamLeader';
};

export const isMemberRole = (user?: User | null): boolean => {
    return user?.role === 'Member';
};

export const isVehicleCoordinator = (user?: User | null): boolean => {
    if (!user) return false;
    return user.role === 'Vehicle Coordinator' || (user.role === 'Coordinator' && !user.stationId);
};

export const isStageCoordinator = (user?: User | null): boolean => {
    if (!user) return false;
    return user.role === 'Stage Coordinator' || (user.role === 'Coordinator' && !!user.stationId);
};

export const canApproveVehicle = (user?: User | null): boolean => {
    if (!user) return false;
    return ['Administrator', 'Super Admin', 'TeamLeader', 'Head of Dept', 'Dept Admin'].includes(user.role || '');
};

export const canViewCheckInTab = (user?: User | null): boolean => {
    if (!user) return false;
    // Logistics cannot view checkin
    if (hasLogisticsAccess(user)) return false;
    return true;
};
