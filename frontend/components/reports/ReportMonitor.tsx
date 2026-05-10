
import React, { useState, useEffect } from 'react';
import { MonitoringReport, ReportSubmission } from '../../types';
import { DepartmentStore } from '../../database/departmentStore';
import { ArrowLeft, Check, X, Clock, Eye } from 'lucide-react';

interface ReportMonitorProps {
    report: MonitoringReport;
    onBack: () => void;
}

const ReportMonitor: React.FC<ReportMonitorProps> = ({ report, onBack }) => {
    const [stats, setStats] = useState<any[]>([]); // Derived from departments + submissions
    const [selectedSubmission, setSelectedSubmission] = useState<ReportSubmission | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [departments, setDepartments] = useState<any[]>([]);

    useEffect(() => {
        DepartmentStore.getAll().then(res => {
            if (res.status === 'success') {
                setDepartments(res.data.filter(d => d.status.toLowerCase() === 'active'));
            }
        });
    }, []);

    useEffect(() => {
        if (report && departments.length > 0) {
            // @ts-ignore - report_submissions might not be in the type definition yet but is in the object
            const submissions = report.report_submissions || [];

            // Map active departments to their submission status
            const merged = departments.map(dept => {
                const sub = submissions.find((s: any) => s.department_id === dept.id);
                return {
                    ...dept,
                    submission: sub,
                    status: sub?.status || 'Pending'
                };
            });
            setStats(merged);
        }
    }, [report, departments]);

    const filteredStats = stats.filter(dept =>
        filterStatus === 'All' ? true : dept.status === filterStatus
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button onClick={onBack} className="flex items-center text-gray-500 hover:text-black mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reports
            </button>

            <div className="flex justify-between items-start mb-8">
                {report && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{report.title}</h2>
                        <div className="flex gap-6 mt-2 text-sm text-gray-600">
                            <span>Month: {report.month}</span>
                            <span>Deadline: {new Date(report.deadline).toDateString()}</span>
                            <span>Status: {report.status}</span>
                        </div>
                    </div>
                )}

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                >
                    <option value="All">All Departments</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Department</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                            <th className="p-4 font-semibold text-gray-600">Submitted At</th>
                            <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStats.map(dept => (
                            <tr key={dept.id} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="p-4 font-medium">{dept.name}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit gap-1 ${dept.status === 'Submitted' ? 'bg-green-100 text-green-700' :
                                        dept.status === 'Draft' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {dept.status === 'Submitted' && <Check className="w-3 h-3" />}
                                        {dept.status === 'Draft' && <Clock className="w-3 h-3" />}
                                        {dept.status}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-500 text-sm">
                                    {dept.submission?.submitted_at ? new Date(dept.submission.submitted_at).toLocaleString() : '-'}
                                </td>
                                <td className="p-4 text-right">
                                    {dept.submission && (
                                        <button
                                            onClick={() => setSelectedSubmission(dept.submission)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-end gap-1 ml-auto"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Simple View Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-xl font-bold">Submission Details</h3>
                            <button onClick={() => setSelectedSubmission(null)} className="text-gray-500 hover:text-black">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {report?.fields.map(field => (
                                <div key={field.id} className="border-b border-gray-100 pb-4 last:border-0">
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{field.label}</h4>
                                    <div className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                                        {selectedSubmission.content[field.id] || <span className="text-gray-400 italic">No answer</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportMonitor;
