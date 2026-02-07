
import React, { useState, useEffect } from 'react';
import { User, MonitoringReport } from '../types';
import ReportFiller from '../components/reports/ReportFiller'; // Will create effectively
import { Check, ClipboardList, Clock } from 'lucide-react';

interface MyReportsViewProps {
    user: User;
}

const MyReportsView: React.FC<MyReportsViewProps> = ({ user }) => {
    const [reports, setReports] = useState<MonitoringReport[]>([]);
    const [selectedReport, setSelectedReport] = useState<MonitoringReport | null>(null);

    useEffect(() => {
        fetchReports();
    }, [user.departmentId]);

    const fetchReports = async () => {
        if (!user.departmentId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/reports/department/${user.departmentId}`);
            const data = await res.json();
            setReports(data || []);
        } catch (error) {
            console.error('Failed to fetch reports', error);
        }
    };

    const handleSuccess = () => {
        setSelectedReport(null);
        fetchReports();
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Department Reports</h1>
                <p className="text-gray-500">Submit pending reports for your department</p>
            </div>

            {!selectedReport ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedReport(report)}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-lg ${(report as any).submissionStatus === 'Submitted'
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-orange-100 text-orange-600'
                                        }`}>
                                        <ClipboardList className="w-6 h-6" />
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${(report as any).submissionStatus === 'Submitted'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {(report as any).submissionStatus || 'Pending'}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.title}</h3>
                                <p className="text-xs text-gray-400 mb-4">Due: {new Date(report.deadline).toDateString()}</p>

                                <div className="flex items-center text-sm text-gray-500">
                                    <Clock className="w-4 h-4 mr-1" />
                                    <span>
                                        {(report as any).submissionStatus === 'Submitted'
                                            ? 'View Submission'
                                            : 'Action Required'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {reports.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            No reports assigned to your department.
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <button
                        onClick={() => setSelectedReport(null)}
                        className="mb-6 text-sm text-gray-500 hover:text-gray-900"
                    >
                        ← Back to Reports
                    </button>
                    <h2 className="text-2xl font-bold mb-6">{selectedReport.title}</h2>
                    <ReportFiller
                        report={selectedReport}
                        departmentId={user.departmentId || ''}
                        user={user}
                        onSuccess={handleSuccess}
                    />
                </div>
            )}
        </div>
    );
};

export default MyReportsView;
