import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { HealingReport } from '../../database/HealingStore';

interface ReportsTabProps {
    reports: HealingReport[];
    handleEditReport: (report: HealingReport) => void;
    handleDeleteReport: (id: string) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ reports, handleEditReport, handleDeleteReport }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-6">All Outreach Reports</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium">Hospital</th>
                            <th className="px-6 py-4 font-medium">Labourers</th>
                            <th className="px-6 py-4 font-medium">Souls Won</th>
                            <th className="px-6 py-4 font-medium">Testimonies</th>
                            <th className="px-6 py-4 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {reports.map((report) => (
                            <tr key={report.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-gray-600">{new Date(report.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-semibold text-gray-900">{report.hospital_name}</td>
                                <td className="px-6 py-4 text-gray-600">{report.labourers_count}</td>
                                <td className="px-6 py-4 text-green-600 font-bold">{report.souls_count}</td>
                                <td className="px-6 py-4 text-gray-600">{report.healing_testimonies?.length || 0}</td>
                                <td className="px-6 py-4 flex space-x-2">
                                    <button
                                        onClick={() => handleEditReport(report)}
                                        className="p-1 px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteReport(report.id)}
                                        className="p-1 px-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
