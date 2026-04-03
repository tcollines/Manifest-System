import { Request, Response } from 'express';
import { supabase } from '../supabase';

// --- Admin / Team Leader Endpoints ---

export const getAllReports = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { data, error } = await supabase
            .from('monitoring_reports')
            .select('*, report_submissions(*)')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const createReport = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { title, month, deadline, fields, created_by } = req.body;

        if (!title || !month || !deadline) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('monitoring_reports')
            .insert([{
                manifest_id: manifestId, // INJECT TENANT ID
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
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const updateReport = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('monitoring_reports')
            .update(req.body)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Report updated successfully' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

// --- HoD Endpoints ---

export const getMyReports = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { departmentId } = req.params;

    if (!departmentId) {
        return res.status(400).json({ error: 'Department ID is required' });
    }

    try {
        const { data: reports, error: reportsError } = await supabase
            .from('monitoring_reports')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .neq('status', 'Draft')
            .order('deadline', { ascending: false });

        if (reportsError) throw reportsError;

        const { data: submissions, error: distinctError } = await supabase
            .from('report_submissions')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('department_id', departmentId);

        if (distinctError) throw distinctError;

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
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const submitReport = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { departmentId, content, status, userId } = req.body;

    if (!departmentId || !content) {
        return res.status(400).json({ error: 'Missing departmentId or content' });
    }

    try {
        if (status === 'Submitted') {
            const { data: report } = await supabase
                .from('monitoring_reports')
                .select('deadline, status')
                .eq('manifest_id', manifestId) // Tenant Isolation
                .eq('id', id)
                .single();

            if (report) {
                if (report.status === 'Expired') {
                    return res.status(403).json({ error: 'Report is expired' });
                }

                const now = new Date().getTime();
                const deadline = new Date(report.deadline).getTime();

                if (deadline < now) {
                    return res.status(403).json({ error: 'Deadline passed' });
                }
            }
        }

        const { data, error } = await supabase
            .from('report_submissions')
            .upsert({
                manifest_id: manifestId, // INJECT TENANT ID
                report_id: id,
                department_id: departmentId,
                content,
                status,
                submitted_by: userId,
                submitted_at: status === 'Submitted' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'report_id, department_id' }) // NOTE: If composite unique index includes manifest_id, this might need tuning. It does via RLS in phase 3.
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const deleteReport = async (req: Request, res: Response) => {
    const manifestId = (req as any).manifestId;
    if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('monitoring_reports')
            .delete()
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Report deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
