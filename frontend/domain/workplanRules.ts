/**
 * WORKPLAN RULES — Domain Layer
 * Business rules for monthly workplan status transitions.
 */

import { WorkplanStatus } from '../shared/enums';
import { DeptRole, SystemRole } from '../shared/enums';

const SYSTEM_ADMIN_ROLES: SystemRole[] = ['Super Admin', 'Administrator', 'TeamLeader'];

/** Returns true if the current status/role combination allows submission */
export const canSubmitWorkplan = (
    currentStatus: string,
    deptRole: DeptRole | null,
    systemRole: SystemRole | null,
): boolean => {
    const isAdmin = systemRole && SYSTEM_ADMIN_ROLES.includes(systemRole);
    const canEdit = deptRole === 'HOD' || deptRole === 'Dept Admin' || isAdmin;
    return currentStatus === WorkplanStatus.DRAFT && !!canEdit;
};

/** Returns true if the current status/role combination allows approval */
export const canApproveWorkplan = (
    currentStatus: string,
    systemRole: SystemRole | null,
): boolean => {
    const isAdmin = systemRole && SYSTEM_ADMIN_ROLES.includes(systemRole);
    return currentStatus === WorkplanStatus.SUBMITTED && !!isAdmin;
};

/** Returns true if the workplan can be edited */
export const canEditWorkplan = (
    currentStatus: string,
    deptRole: DeptRole | null,
    systemRole: SystemRole | null,
): boolean => {
    const isAdmin = systemRole && SYSTEM_ADMIN_ROLES.includes(systemRole);
    const canEdit = deptRole === 'HOD' || deptRole === 'Dept Admin' || isAdmin;
    return currentStatus === WorkplanStatus.DRAFT && !!canEdit;
};

/** Returns the next status label for display */
export const getWorkplanNextAction = (
    currentStatus: string,
    deptRole: DeptRole | null,
    systemRole: SystemRole | null,
): { label: string; nextStatus: WorkplanStatus } | null => {
    if (canSubmitWorkplan(currentStatus, deptRole, systemRole)) {
        return { label: 'Submit for Approval', nextStatus: WorkplanStatus.SUBMITTED };
    }
    if (canApproveWorkplan(currentStatus, systemRole)) {
        return { label: 'Approve Workplan', nextStatus: WorkplanStatus.APPROVED };
    }
    return null;
};
