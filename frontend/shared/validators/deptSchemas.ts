import { z } from 'zod';

// ─── UUID helper ──────────────────────────────────────────────────────────────
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid = () => z.string().regex(uuidRegex, 'Must be a valid UUID');

// ─── Phone helper ─────────────────────────────────────────────────────────────
const e164Phone = () =>
    z.string().regex(/^\+[1-9]\d{10,14}$/, 'Must be a valid E.164 phone number (e.g. +256700000000)');

// ─── Department ───────────────────────────────────────────────────────────────
export const CreateDepartmentSchema = z.object({
    name:        z.string().min(2, 'Department name is required').max(80),
    description: z.string().max(300).optional(),
    icon:        z.string().min(1).optional(),
    headId:      uuid().optional(),
});
export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;

// ─── Dept Church Member ───────────────────────────────────────────────────────
export const AddChurchMemberSchema = z.object({
    memberId:    uuid(),
    servingRole: z.string().min(1, 'Serving role is required').max(80),
    joinedDate:  z.string().datetime({ offset: true }).optional(),
});
export type AddChurchMemberInput = z.infer<typeof AddChurchMemberSchema>;

// ─── Service Schedule ─────────────────────────────────────────────────────────
export const CreateScheduleSchema = z.object({
    departmentId: uuid(),
    title:        z.string().min(2, 'Schedule title is required').max(120),
    weekStart:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date (YYYY-MM-DD)'),
    notes:        z.string().max(500).optional(),
});
export type CreateScheduleInput = z.infer<typeof CreateScheduleSchema>;

export const AddSessionSchema = z.object({
    sessionLabel: z.string().min(1, 'Session label is required').max(80),
    sessionDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date (YYYY-MM-DD)'),
    arrivalTime:  z.string().min(1, 'Arrival time is required').max(20),
    notes:        z.string().max(300).optional(),
});
export type AddSessionInput = z.infer<typeof AddSessionSchema>;

export const AddAssignmentSchema = z.object({
    roleLabel:    z.string().min(1, 'Role is required').max(80),
    ministerName: z.string().min(1, 'Name is required').max(100),
    memberId:     uuid().optional(),
});
export type AddAssignmentInput = z.infer<typeof AddAssignmentSchema>;

// ─── Monthly Workplan ─────────────────────────────────────────────────────────
const WorkplanActivitySchema = z.object({
    week:        z.string().min(1, 'Week is required'),
    activity:    z.string().min(1, 'Activity is required').max(200),
    responsible: z.string().min(1, 'Responsible person is required').max(100),
    target:      z.string().min(1, 'Target is required').max(200),
    status:      z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
});
export type WorkplanActivity = z.infer<typeof WorkplanActivitySchema>;

export const CreateWorkplanSchema = z.object({
    departmentId: uuid(),
    title:        z.string().min(2, 'Workplan title is required').max(120),
    month:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date (YYYY-MM-DD)'),
    objectives:   z.string().max(600).optional(),
    activities:   z.array(WorkplanActivitySchema).min(1, 'At least one activity is required'),
});
export type CreateWorkplanInput = z.infer<typeof CreateWorkplanSchema>;

// ─── Dept Finance Entry ───────────────────────────────────────────────────────
export const AddFinanceEntrySchema = z.object({
    departmentId: uuid(),
    type:         z.enum(['Income', 'Expense']),
    category:     z.string().min(1, 'Category is required').max(80),
    amount:       z.number().int('Amount must be a whole number').positive('Amount must be positive'),
    description:  z.string().max(300).optional(),
    date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date'),
});
export type AddFinanceEntryInput = z.infer<typeof AddFinanceEntrySchema>;

// ─── Validator helper ─────────────────────────────────────────────────────────
type ValidateSuccess<T> = { success: true; data: T };
type ValidateFailure = { success: false; errors: Record<string, string> };

/**
 * Validate a form payload against a Zod schema.
 * Returns { success: true, data } or { success: false, errors: Record<field, message> }
 */
export function validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
): ValidateSuccess<T> | ValidateFailure {
    const result = schema.safeParse(data);
    if (result.success) return { success: true, data: result.data };
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_form';
        errors[key] = issue.message;
    }
    return { success: false, errors };
}
