import React, { useState } from 'react';
import { SchoolOutreachReport, MinistryEvent, User } from '../../types';
import { SchoolsStore } from '../../database/schoolsStore';
import { useNotification } from '../ui/NotificationSystem';
import { Plus, Save } from 'lucide-react';

interface ReportsTabProps {
    reports: SchoolOutreachReport[];
    events: MinistryEvent[];
    currentUser: User;
    reportEventId: string;
    setReportEventId: (id: string) => void;
    refreshReports: () => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
    reports,
    events,
    currentUser,
    reportEventId,
    setReportEventId,
    refreshReports
}) => {
    const { showToast } = useNotification();
    const [isAddingReport, setIsAddingReport] = useState(false);
    const [newReport, setNewReport] = useState<Partial<SchoolOutreachReport>>({
        date: new Date().toISOString().split('T')[0],
        labourers: []
    });

    const handleAddLabourer = () => {
        const current = newReport.labourers || [];
        setNewReport({ ...newReport, labourers: [...current, { name: '', contact: '' }] });
    };

    const handleLabourerChange = (index: number, field: 'name' | 'contact', value: string) => {
        const current = [...(newReport.labourers || [])];
        current[index] = { ...current[index], [field]: value };
        setNewReport({ ...newReport, labourers: current });
    };

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!newReport.date || !newReport.centreName || !newReport.purpose) {
                showToast("Please fill in all required fields", 'error');
                return;
            }

            await SchoolsStore.addReport({
                ...newReport,
                eventId: newReport.eventId || reportEventId,
                submittedBy: currentUser.name,
                submittedAt: new Date().toISOString()
            } as Omit<SchoolOutreachReport, 'id'>);

            showToast("Report submitted successfully");
            setIsAddingReport(false);
            setNewReport({ date: new Date().toISOString().split('T')[0], labourers: [] });
            refreshReports();
        } catch (error) {
            console.error("Error submitting report:", error);
            showToast("Failed to submit report", 'error');
        }
    };

    if (isAddingReport) {
        return (
            <form onSubmit={handleSubmitReport} className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="text-xl font-bold">New Outreach Report</h3>
                    <button type="button" onClick={() => setIsAddingReport(false)} className="text-gray-500 hover:text-black">Cancel</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Date</label>
                        <input type="date" required value={newReport.date} onChange={e => setNewReport({ ...newReport, date: e.target.value })} className="w-full p-3 border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Event Scoping</label>
                        <select
                            required
                            value={newReport.eventId || reportEventId || ''}
                            onChange={e => setNewReport({ ...newReport, eventId: e.target.value })}
                            className="w-full p-3 border rounded-xl"
                        >
                            <option value="">Select Event...</option>
                            {events.map(event => (
                                <option key={event.id} value={event.id}>{event.title} ({event.date})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Outreach Centre</label>
                        <input required value={newReport.centreName || ''} onChange={e => setNewReport({ ...newReport, centreName: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="School Name" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Purpose</label>
                    <input required value={newReport.purpose || ''} onChange={e => setNewReport({ ...newReport, purpose: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="e.g. Fellowship, Evangelism" />
                </div>

                {/* Stats */}
                <div className="bg-gray-50 p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Total Attendance</label>
                        <input type="number" required value={newReport.totalAttendance || ''} onChange={e => setNewReport({ ...newReport, totalAttendance: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Teachers</label>
                        <input type="number" required value={newReport.teachersAttendance || ''} onChange={e => setNewReport({ ...newReport, teachersAttendance: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Students</label>
                        <input type="number" required value={newReport.studentsAttendance || ''} onChange={e => setNewReport({ ...newReport, studentsAttendance: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Souls Won</label>
                        <input type="number" required value={newReport.soulsWon || ''} onChange={e => setNewReport({ ...newReport, soulsWon: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg" />
                    </div>
                </div>

                {/* Word */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Sermon Title</label>
                        <input required value={newReport.sermonTitle || ''} onChange={e => setNewReport({ ...newReport, sermonTitle: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Title" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Scriptures</label>
                        <input required value={newReport.scriptureReferences || ''} onChange={e => setNewReport({ ...newReport, scriptureReferences: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="John 3:16" />
                    </div>
                </div>

                {/* Labourers */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-gray-700">Labourers</label>
                        <button type="button" onClick={handleAddLabourer} className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">Add Person</button>
                    </div>
                    {newReport.labourers?.map((l, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input placeholder="Name" value={l.name} onChange={e => handleLabourerChange(idx, 'name', e.target.value)} className="flex-1 p-2 border rounded-lg" />
                            <input placeholder="Contact" value={l.contact} onChange={e => handleLabourerChange(idx, 'contact', e.target.value)} className="flex-1 p-2 border rounded-lg" />
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Additional Notes</label>
                    <textarea value={newReport.notes || ''} onChange={e => setNewReport({ ...newReport, notes: e.target.value })} className="w-full p-3 border rounded-xl h-24" placeholder="Any other observations..." />
                </div>

                <button type="submit" className="w-full bg-ministry-text text-white font-bold py-3 rounded-xl hover:bg-ministry-orange transition-colors flex justify-center items-center gap-2">
                    <Save className="w-4 h-4" />
                    <span>Submit Report</span>
                </button>
            </form>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-4 w-full md:w-auto">
                    <h3 className="text-lg font-bold text-gray-800 whitespace-nowrap">Recent Reports</h3>
                    <select
                        value={reportEventId}
                        onChange={(e) => setReportEventId(e.target.value)}
                        className="p-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministry-orange w-full md:w-64"
                    >
                        <option value="">All Events</option>
                        {events.map(event => (
                            <option key={event.id} value={event.id}>{event.title} ({event.date})</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => setIsAddingReport(true)}
                    className="flex items-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-ministry-orange transition-colors w-full md:w-auto justify-center"
                >
                    <Plus className="w-4 h-4" />
                    <span>New Report</span>
                </button>
            </div>

            <div className="grid gap-4">
                {reports.map(report => (
                    <div key={report.id} className="bg-white border border-gray-100 p-4 rounded-xl hover:border-ministry-orange/30 transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-lg text-ministry-text">{report.centreName}</h4>
                                <p className="text-sm text-gray-500">{report.date} • {report.purpose}</p>
                            </div>
                            <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs">
                                {report.soulsWon} Souls Won
                            </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t border-gray-50">
                            <div>
                                <p className="text-gray-400 text-xs uppercase">Total Attendance</p>
                                <p className="font-bold">{report.totalAttendance}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs uppercase">Teachers</p>
                                <p className="font-bold">{report.teachersAttendance}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs uppercase">Students</p>
                                <p className="font-bold">{report.studentsAttendance}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs uppercase">Submitted By</p>
                                <p className="font-bold">Staff</p> {/* Ideally lookup user name */}
                            </div>
                        </div>
                        {report.notes && (
                            <div className="mt-3 bg-gray-50 p-2 rounded text-sm text-gray-600 italic">
                                "{report.notes}"
                            </div>
                        )}
                    </div>
                ))}
                {reports.length === 0 && (
                    <p className="text-center text-gray-500 py-10">No reports submitted yet.</p>
                )}
            </div>
        </div>
    );
};
