/**
 * DEPT ACCESS RULES — Domain Layer
 * Defines which tabs each department role can view and what actions they can take.
 * Used by GenericDeptDashboard to filter tab visibility.
 * NEVER duplicate this logic inline in UI components.
 */

import { DeptRole, SystemRole } from '../shared/enums';

// ─── Tab IDs ──────────────────────────────────────────────────────────────────

export type DeptTabId =
    | 'overview'
    | 'team'
    | 'requisitions'
    | 'workplans'
    | 'assets'
    | 'schedule'
    | 'finances'
    | 'reports';

// ─── Access Matrix ────────────────────────────────────────────────────────────

/** Roles that bypass dept-scoped role checks (system-level admins) */
const SYSTEM_ADMIN_ROLES: SystemRole[] = ['Super Admin', 'Administrator', 'TeamLeader'];

const DEPT_TAB_ACCESS: Record<DeptRole, DeptTabId[]> = {
    'HOD':          ['overview', 'team', 'requisitions', 'workplans', 'assets', 'schedule', 'finances', 'reports'],
    'Dept Admin':   ['overview', 'team', 'requisitions', 'workplans', 'assets', 'schedule', 'finances', 'reports'],
    'Dept Finance': ['overview', 'requisitions', 'workplans', 'assets', 'schedule', 'finances'],
    'Member':       ['overview', 'requisitions', 'assets', 'schedule'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the given role can view the given tab.
 * System admins always have full access.
 */
export const canViewTab = (
    deptRole: DeptRole | null,
    systemRole: SystemRole | null,
    tabId: DeptTabId,
): boolean => {
    if (systemRole && SYSTEM_ADMIN_ROLES.includes(systemRole)) return true;
    if (!deptRole) return false;
    return (DEPT_TAB_ACCESS[deptRole] ?? []).includes(tabId);
};

/** Returns all tabs accessible to the given role combination. */
export const getAccessibleTabs = (
    deptRole: DeptRole | null,
    systemRole: SystemRole | null,
): DeptTabId[] => {
    if (systemRole && SYSTEM_ADMIN_ROLES.includes(systemRole)) {
        return ['overview', 'team', 'requisitions', 'workplans', 'assets', 'schedule', 'finances', 'reports'];
    }
    if (!deptRole) return ['overview'];
    return DEPT_TAB_ACCESS[deptRole] ?? ['overview'];
};

/**
 * Returns true if the role can EDIT in the given tab (not just view).
 * Finance role can only view schedule (not edit), etc.
 */
export const canEditInTab = (
    deptRole: DeptRole | null,
    systemRole: SystemRole | null,
    tabId: DeptTabId,
): boolean => {
    if (systemRole && SYSTEM_ADMIN_ROLES.includes(systemRole)) return true;
    if (!canViewTab(deptRole, systemRole, tabId)) return false;
    // Finance role can view schedule but not edit it
    if (deptRole === 'Dept Finance' && tabId === 'schedule') return false;
    if (deptRole === 'Member' && tabId === 'assets') return false;
    return true;
};

/**
 * Returns true if the role can create a new department.
 */
export const canCreateDepartment = (systemRole: SystemRole | null): boolean => {
    if (!systemRole) return false;
    return ['Super Admin', 'Administrator', 'TeamLeader'].includes(systemRole);
};
