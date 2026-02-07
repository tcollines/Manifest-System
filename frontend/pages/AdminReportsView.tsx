
import React, { useState, useEffect } from 'react';
import { User, MonitoringReport } from '../types';
import { Plus, Check, Eye, Trash, FileText } from 'lucide-react';
import ReportBuilder from '../components/reports/ReportBuilder';
import ReportMonitor from '../components/reports/ReportMonitor';
import ConfirmationModal from '../components/ConfirmationModal';

interface AdminReportsViewProps {
    user: User;
}

const AdminReportsView: React.FC<AdminReportsViewProps> = ({ user }) => {
    const [view, setView] = useState<'list' | 'create' | 'monitor'>('list');
    const [reports, setReports] = useState<MonitoringReport[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [reportToDelete, setReportToDelete] = useState<string | null>(null);

    const filteredReports = reports.filter(report =>
        filterStatus === 'All' ? true : report.status === filterStatus
    );

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/reports');
            const data = await res.json();
            setReports(data || []);
        } catch (error) {
            console.error('Failed to fetch reports', error);
        }
    };

    const handleCreateSuccess = () => {
        fetchReports();
        setView('list');
    };


    const handlePublish = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/reports/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Published' })
            });
            if (!res.ok) throw new Error('Failed to publish');
            fetchReports();
        } catch (error) {
            console.error('Error publishing report', error);
            alert('Failed to publish report');
        }
    };

    const confirmDelete = async () => {
        if (!reportToDelete) return;

        try {
            const res = await fetch(`http://localhost:5000/api/reports/${reportToDelete}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete report');
            setReportToDelete(null); // Close modal
            fetchReports();
        } catch (error) {
            console.error('Error deleting report', error);
            alert('Failed to delete report');
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Monthly Reports</h1>
                    <p className="text-gray-500">Manage and monitor department reports</p>
                </div>
                {view === 'list' && (
                    <button
                        onClick={() => setView('create')}
                        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Report
                    </button>
                )}
                {view !== 'list' && (
                    <button
                        onClick={() => setView('list')}
                        className="text-gray-600 hover:text-black"
                    >
                        Back to List
                    </button>
                )}
            </div>

            {view === 'list' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-end">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Draft">Draft</option>
                            <option value="Published">Published</option>
                            <option value="Expired">Expired</option>
                        </select>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Title</th>
                                <th className="p-4 font-semibold text-gray-600">Month</th>
                                <th className="p-4 font-semibold text-gray-600">Deadline</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map(report => (
                                <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="p-4 font-medium">{report.title}</td>
                                    <td className="p-4">{report.month}</td>
                                    <td className="p-4 text-gray-500">{new Date(report.deadline).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${report.status === 'Published' ? 'bg-green-100 text-green-700' :
                                            report.status === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        {report.status === 'Draft' && (
                                            <button
                                                onClick={() => handlePublish(report.id)}
                                                className="text-green-600 hover:text-green-800 flex-inline items-center gap-1 text-sm font-medium mr-2"
                                                title="Publish Report"
                                            >
                                                <Check className="w-4 h-4" />
                                                Publish
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setSelectedReportId(report.id); setView('monitor'); }}
                                            className="text-blue-600 hover:text-blue-800"
                                            title="Monitor Submissions"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => setReportToDelete(report.id)}
                                            className="text-red-500 hover:text-red-700"
                                            title="Delete Report"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {view === 'create' && (
                <ReportBuilder onSuccess={handleCreateSuccess} createdBy={user.id} />
            )}

            {view === 'monitor' && selectedReportId && (
                <ReportMonitor
                    report={reports.find(r => r.id === selectedReportId)!}
                    onBack={() => setView('list')}
                />
            )}

            <ConfirmationModal
                isOpen={!!reportToDelete}
                onClose={() => setReportToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete Report"
                message="Are you sure you want to delete this report? This action cannot be undone."
                type="danger"
                confirmText="Delete Report"
            />
        </div>
    );
};

export default AdminReportsView;
