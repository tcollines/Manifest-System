import { apiFetch } from '../services/api';
import { SchoolOutreachReport } from '../types';

export const SchoolsStore = {
    // Fetch all reports
    async getAllReports(): Promise<SchoolOutreachReport[]> {
        try {
            const data = await apiFetch('/schools/reports');
            return data.map(mapDBToReport);
        } catch (error) {
            console.error('Error fetching school reports:', error);
            return [];
        }
    },

    // Add a new report
    async addReport(report: Omit<SchoolOutreachReport, 'id' | 'submittedAt'>): Promise<SchoolOutreachReport | null> {
        try {
            const dbReport = mapReportToDB(report);
            const data = await apiFetch('/schools/reports', {
                method: 'POST',
                body: JSON.stringify(dbReport)
            });
            return mapDBToReport(data);
        } catch (error) {
            console.error('Error adding school report:', error);
            throw error;
        }
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
