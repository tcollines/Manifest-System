import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { HealingReport } from '../../../database/HealingStore';
import { useHealing } from '../HealingContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const ReportsTab: React.FC = () => {
    const { reports, handleDeleteReport, setEditingReport } = useHealing();
    const navigate = useNavigate();
    const location = useLocation();

    const handleEditReport = (report: HealingReport) => {
        setEditingReport(report);
        const basePath = location.pathname.replace(/\/[^/]+$/, '');
        navigate(`${basePath}/new`);
    };

    return (
        <div className="p-4 md:p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 md:px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base md:text-lg font-bold text-gray-800">All Outreach Reports</h3>
                </div>

                {/* Mobile list */}
                <div className="md:hidden divide-y divide-gray-50">
                    {reports.map(report => (
                        <div key={report.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-gray-900 truncate">{report.hospital_name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{new Date(report.date).toLocaleDateString()} · {report.labourers_count} labourers</p>
                            </div>
                            <span className="text-sm font-black text-green-600 shrink-0">{report.souls_count} souls</span>
                            <div className="flex gap-1.5 shrink-0">
                                <button onClick={() => handleEditReport(report)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Edit2 size={14} /></button>
                                <button onClick={() => handleDeleteReport(report.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                    {reports.length === 0 && <div className="py-10 text-center text-gray-400 text-sm">No reports yet.</div>}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Hospital</th>
                                <th className="px-6 py-4 font-medium">Labourers</th>
                                <th className="px-6 py-4 font-medium">Souls Won</th>
                                <th className="px-6 py-4 font-medium">Testimonies</th>
                                <th className="px-6 py-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {reports.map((report) => (
                                <tr key={report.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600">{new Date(report.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-semibold text-gray-900">{report.hospital_name}</td>
                                    <td className="px-6 py-4 text-gray-600">{report.labourers_count}</td>
                                    <td className="px-6 py-4 text-green-600 font-bold">{report.souls_count}</td>
                                    <td className="px-6 py-4 text-gray-600">{report.healing_testimonies?.length || 0}</td>
                                    <td className="px-6 py-4 flex space-x-2">
                                        <button onClick={() => handleEditReport(report)} className="p-1 px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="Edit"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteReport(report.id)} className="p-1 px-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors" title="Delete"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-400">No reports yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
