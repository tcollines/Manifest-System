
import { Request, Response } from 'express';
import { supabase } from '../supabase';

// --- Admin / Team Leader Endpoints ---

// Get all report templates (Reports)
export const getAllReports = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('monitoring_reports')
            .select('*, report_submissions(*)')
            .order('created_at', { ascending: false });

        // Normalize deadlines in response if needed, but client should handle ISO strings.
        // We ensure that we don't accidentally send local times.
        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new report template
export const createReport = async (req: Request, res: Response) => {
    try {
        const { title, month, deadline, fields, created_by } = req.body;

        // Validation
        if (!title || !month || !deadline) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('monitoring_reports')
            .insert([{
                title,
                month,
                deadline,
                fields: fields || [],
                created_by,
                status: 'Draft'
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Update Report (e.g. Publish, Extend Deadline)
export const updateReport = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('monitoring_reports')
            .update(req.body)
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Report updated successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// --- HoD Endpoints ---

// Get reports for a specific department (e.g., HoD's department)
export const getMyReports = async (req: Request, res: Response) => {
    const { departmentId } = req.params;

    if (!departmentId) {
        return res.status(400).json({ error: 'Department ID is required' });
    }

    try {
        // 1. Get all published or expired reports
        const { data: reports, error: reportsError } = await supabase
            .from('monitoring_reports')
            .select('*')
            .neq('status', 'Draft')
            .order('deadline', { ascending: false });

        if (reportsError) throw reportsError;

        // 2. Get existing submissions for this department
        const { data: submissions, error: distinctError } = await supabase
            .from('report_submissions')
            .select('*')
            .eq('department_id', departmentId);

        if (distinctError) throw distinctError;

        // 3. Merge: Attach submission status to report
        const merged = reports.map(report => {
            const submission = submissions?.find(s => s.report_id === report.id);
            return {
                ...report,
                submission: submission || null,
                submissionStatus: submission?.status || 'Pending'
            };
        });

        res.json(merged);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Submit a report (or save draft)
export const submitReport = async (req: Request, res: Response) => {
    const { id } = req.params; // Report ID
    const { departmentId, content, status, userId } = req.body;

    if (!departmentId || !content) {
        return res.status(400).json({ error: 'Missing departmentId or content' });
    }

    try {
        // Check if report is expired (unless just saving or updating by admin)
        // For simplicity, we allow late submissions but flag them? 
        // Requirement says: "After deadline expiry: HoDs cannot submit."

        if (status === 'Submitted') {
            const { data: report } = await supabase
                .from('monitoring_reports')
                .select('deadline, status')
                .eq('id', id)
                .single();

            if (report) {
                if (report.status === 'Expired') {
                    return res.status(403).json({ error: 'Report is expired' });
                }

                // Standardized UTC Deadline Check
                const now = new Date().getTime();
                const deadline = new Date(report.deadline).getTime();

                if (deadline < now) {
                    return res.status(403).json({ error: 'Deadline passed' });
                }
            }
        }

        // Upsert submission
        const { data, error } = await supabase
            .from('report_submissions')
            .upsert({
                report_id: id,
                department_id: departmentId,
                content,
                status,
                submitted_by: userId,
                submitted_at: status === 'Submitted' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'report_id, department_id' })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Report
export const deleteReport = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('monitoring_reports')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Report deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
