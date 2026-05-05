import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { ResidenceOutreachReport } from '../../../types';
import { useResidentContext } from '../ResidentContext';

const ReportsTab: React.FC = () => {
    const { reports, residences, events, addReportProvider: addReport, loadingContext: loading } = useResidentContext();
    const [showAddReport, setShowAddReport] = useState(false);

    const [newReport, setNewReport] = useState<Partial<ResidenceOutreachReport>>({
        residence_id: '',
        date: new Date().toISOString().split('T')[0],
        souls_won: 0,
        notes: '',
        event_id: ''
    });

    const handleAddReport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addReport(newReport as Omit<ResidenceOutreachReport, 'id' | 'manifest_id' | 'created_at' | 'updated_at'>);
            setShowAddReport(false);
            setNewReport({ residence_id: '', date: new Date().toISOString().split('T')[0], souls_won: 0, notes: '', event_id: '' });
        } catch (err) {
            console.error("Failed to add report:", err);
            // Ideally show a toast notification here
        }
    };


    return (
                    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-base md:text-xl font-semibold text-ministry-text">Outreach Reports</h2>
                            <button
                                onClick={() => setShowAddReport(!showAddReport)}
                                className="px-3 py-2 bg-ministry-primary text-white rounded-xl hover:bg-ministry-primary/90 flex items-center text-sm font-bold gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Submit Report</span>
                                <span className="sm:hidden">Add</span>
                            </button>
                        </div>

                        {showAddReport && (
                            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-base md:text-lg font-medium mb-4">Submit Outreach Report</h3>
                                <form onSubmit={handleAddReport} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Residence</label>
                                            <select
                                                required
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ministry-primary focus:border-transparent outline-none bg-white text-sm"
                                                value={newReport.residence_id || ''}
                                                onChange={(e) => setNewReport({ ...newReport, residence_id: e.target.value })}
                                            >
                                                <option value="">Select a residence</option>
                                                {residences.map(res => (
                                                    <option key={res.id} value={res.id}>{res.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                            <input
                                                required
                                                type="date"
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ministry-primary focus:border-transparent outline-none text-sm"
                                                value={newReport.date || ''}
                                                onChange={(e) => setNewReport({ ...newReport, date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Souls Won</label>
                                            <input
                                                required
                                                type="number"
                                                min="0"
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ministry-primary focus:border-transparent outline-none text-sm"
                                                value={newReport.souls_won || 0}
                                                onChange={(e) => setNewReport({ ...newReport, souls_won: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Related Event (Optional)</label>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ministry-primary focus:border-transparent outline-none bg-white text-sm"
                                                value={newReport.event_id || ''}
                                                onChange={(e) => setNewReport({ ...newReport, event_id: e.target.value })}
                                            >
                                                <option value="">None</option>
                                                {events.map(event => (
                                                    <option key={event.id} value={event.id}>{event.title} - {new Date(event.date).toLocaleDateString()}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Details</label>
                                            <textarea
                                                rows={3}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ministry-primary focus:border-transparent outline-none text-sm"
                                                value={newReport.notes || ''}
                                                onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
                                                placeholder="Describe the outreach activity..."
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end space-x-3">
                                        <button type="button" onClick={() => setShowAddReport(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
                                        <button type="submit" className="px-4 py-2 bg-ministry-primary text-white rounded-lg hover:bg-ministry-primary/90 text-sm font-bold disabled:opacity-50" disabled={loading}>
                                            {loading ? 'Submitting...' : 'Submit Report'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {reports.length > 0 ? (
                                <>
                                    {/* Mobile list */}
                                    <div className="md:hidden divide-y divide-gray-50">
                                        {reports.map((report) => (
                                            <div key={report.id} className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900">{residences.find(r => r.id === report.residenceId)?.name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{new Date(report.date).toLocaleDateString()}</p>
                                                </div>
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 shrink-0 ml-3">{report.soulsWon} souls</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Desktop table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Residence</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Souls Won</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {reports.map((report) => (
                                                    <tr key={report.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(report.date).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{residences.find(r => r.id === report.residenceId)?.name || 'Unknown'}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{report.soulsWon}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={report.notes}>{report.notes || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 text-center text-gray-500 text-sm">No outreach reports submitted yet.</div>
                            )}
                        </div>
                    </div>
    );
};

export default ReportsTab;
