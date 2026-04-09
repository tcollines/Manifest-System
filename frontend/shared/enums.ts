/**
 * SHARED ENUMS — Manifest Management System
 * Single source of truth for all status, role, and type constants.
 * STANDARDS.md §2: Never use naked string literals for statuses.
 */

// ─── Workflow ─────────────────────────────────────────────────────────────────

export enum WorkflowStatus {
    PENDING   = 'Pending',
    APPROVED  = 'Approved',
    REJECTED  = 'Rejected',
    PAID      = 'Paid',
}

export enum WorkplanStatus {
    DRAFT     = 'Draft',
    SUBMITTED = 'Submitted',
    APPROVED  = 'Approved',
}

export enum ScheduleStatus {
    DRAFT     = 'Draft',
    PUBLISHED = 'Published',
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export type SystemRole =
    | 'Super Admin'
    | 'Administrator'
    | 'TeamLeader'
    | 'Data Entrant'
    | 'Logistics'
    | 'Coordinator'
    | 'Vehicle Coordinator'
    | 'Stage Coordinator'
    | 'Resident Coordinator';

export type DeptRole = 'HOD' | 'Dept Admin' | 'Dept Finance' | 'Member';

// ─── Dept Finance ─────────────────────────────────────────────────────────────

export enum FinanceEntryType {
    INCOME    = 'Income',
    EXPENSE   = 'Expense',
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export enum AttendanceStatus {
    CHECKED_IN  = 'Checked In',
    CHECKED_OUT = 'Checked Out',
    ABSENT      = 'Absent',
}

// ─── Members ──────────────────────────────────────────────────────────────────

export enum SoulStatus {
    NEW        = 'New',
    CONTACTED  = 'Contacted',
    VISITED    = 'Visited',
    INTEGRATED = 'Integrated',
    LOST       = 'Lost',
    CONFIRMED  = 'Confirmed',
}

export enum FollowUpStatus {
    PENDING      = 'Pending',
    CALLED       = 'Called',
    MESSAGE_SENT = 'Message Sent',
    VISITED      = 'Visited',
}

// ─── Transportation ───────────────────────────────────────────────────────────

export enum VehicleJourneyStage {
    ONBOARDING            = 'Onboarding',
    VERIFYING             = 'Verifying',
    REGISTRATION_APPROVAL = 'RegApproval',
    FINANCE_APPROVAL      = 'FinanceApproval',
    TRANSIT               = 'Transit',
    ARRIVED               = 'Arrived',
    COMPLETED             = 'Completed',
}

// ─── Generic ──────────────────────────────────────────────────────────────────

export enum Gender {
    MALE   = 'Male',
    FEMALE = 'Female',
}

export enum ActiveStatus {
    ACTIVE   = 'Active',
    INACTIVE = 'Inactive',
}
