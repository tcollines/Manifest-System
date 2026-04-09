/**
 * SCHEDULE RULES — Domain Layer
 * Business rules for service schedule management and serving consistency.
 */

import { ScheduleStatus } from '../shared/enums';
import { DeptRole, SystemRole } from '../shared/enums';

const SYSTEM_ADMIN_ROLES: SystemRole[] = ['Super Admin', 'Administrator', 'TeamLeader'];

/** Returns true if the role can publish a schedule */
export const canPublishSchedule = (
    deptRole: DeptRole | null,
    systemRole: SystemRole | null,
): boolean => {
    const isAdmin = systemRole && SYSTEM_ADMIN_ROLES.includes(systemRole);
    return deptRole === 'HOD' || deptRole === 'Dept Admin' || !!isAdmin;
};

/** Returns true if the role can edit (add sessions/assignments) */
export const canEditSchedule = canPublishSchedule;

/** Returns true if a schedule can be published (has at least one session with one assignment) */
export const isSchedulePublishable = (
    sessions: Array<{ assignments?: unknown[] }>,
): boolean => {
    return sessions.length > 0 && sessions.some(s => (s.assignments?.length ?? 0) > 0);
};

/**
 * Calculates a simple serving consistency score for a member.
 * @param scheduledCount - times they were scheduled
 * @param totalSchedules - total schedules in the period
 * @returns 0–100 percentage
 */
export const getServingConsistencyScore = (
    scheduledCount: number,
    totalSchedules: number,
): number => {
    if (totalSchedules === 0) return 0;
    return Math.round((scheduledCount / totalSchedules) * 100);
};

/** Returns a label for the consistency score */
export const getConsistencyLabel = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: 'Excellent',   color: 'text-green-600' };
    if (score >= 60) return { label: 'Good',        color: 'text-blue-600' };
    if (score >= 40) return { label: 'Fair',        color: 'text-yellow-600' };
    return             { label: 'Needs Attention', color: 'text-red-500' };
};
