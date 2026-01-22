import { supabase } from '../services/supabaseClient';
import { SchoolOutreachReport } from '../types';

export const SchoolsStore = {
    // Fetch all reports
    async getAllReports(): Promise<SchoolOutreachReport[]> {
        const { data, error } = await supabase
            .from('school_outreach_reports')
            .select('*')
            .order('date', { ascending: false });

        if (error) {
            console.error('Error fetching school reports:', error);
            return [];
        }

        return data.map(mapDBToReport);
    },

    // Add a new report
    async addReport(report: Omit<SchoolOutreachReport, 'id' | 'submittedAt'>): Promise<SchoolOutreachReport | null> {
        const dbReport = mapReportToDB(report);
        const { data, error } = await supabase
            .from('school_outreach_reports')
            .insert([dbReport])
            .select()
            .single();

        if (error) {
            console.error('Error adding school report:', error);
            throw error;
        }

        return mapDBToReport(data);
    }
};

// Helpers
const mapReportToDB = (report: Partial<SchoolOutreachReport>) => ({
    date: report.date,
    centre_name: report.centreName,
    purpose: report.purpose,
    labourers: report.labourers,
    total_attendance: report.totalAttendance,
    teachers_attendance: report.teachersAttendance,
    students_attendance: report.studentsAttendance,
    souls_won: report.soulsWon,
    sermon_title: report.sermonTitle,
    scripture_references: report.scriptureReferences,
    notes: report.notes,
    submitted_by: report.submittedBy
});

const mapDBToReport = (db: any): SchoolOutreachReport => ({
    id: db.id,
    date: db.date,
    centreName: db.centre_name,
    purpose: db.purpose,
    labourers: db.labourers || [],
    totalAttendance: db.total_attendance,
    teachersAttendance: db.teachers_attendance,
    studentsAttendance: db.students_attendance,
    soulsWon: db.souls_won,
    sermonTitle: db.sermon_title,
    scriptureReferences: db.scripture_references,
    notes: db.notes,
    submittedBy: db.submitted_by,
    submittedAt: db.submitted_at
});
