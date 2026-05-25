/**
 * CoordinatorReportsTab
 *
 * Outreach report submission form + impact info panel.
 * Consumes shared state via useResidentCoordinator() — no props.
 */

import React from 'react';
import { useResidentCoordinator } from '../ResidentCoordinatorContext';
import { Calendar, Loader2 } from 'lucide-react';

// Local Plus icon (matching monolith pattern)
const Plus = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const CoordinatorReportsTab: React.FC = () => {
    const { newReport, setNewReport, handleAddReport, isSubmitting } = useResidentCoordinator();

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Report Form */}
            <div className="md:col-span-1">
                <form onSubmit={handleAddReport} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-24">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mr-3">
                            <Plus className="w-5 h-5" />
                        </div>
                        Submit Report
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                value={newReport.date || ''}
                                onChange={e => setNewReport({ ...newReport, date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ministry-orange focus:border-ministry-orange outline-none"
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Souls Won</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={newReport.soulsWon || 0}
                                onChange={e => setNewReport({ ...newReport, soulsWon: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ministry-orange focus:border-ministry-orange outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Testimonies (Optional)</label>
                            <textarea
                                value={newReport.notes || ''}
                                onChange={e => setNewReport({ ...newReport, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ministry-orange focus:border-ministry-orange h-32 resize-none outline-none"
                                placeholder="Share highlights from the outreach..."
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-6 bg-ministry-orange text-white py-2.5 rounded-xl font-bold hover:bg-orange-600 transition-colors flex justify-center items-center disabled:opacity-70"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Report'}
                    </button>
                </form>
            </div>

            {/* Info Panel */}
            <div className="md:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center h-full flex flex-col justify-center items-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <Calendar className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Track Your Impact</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Use the form to log souls won during community outreach. Your entries help track total community growth across all residential areas.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CoordinatorReportsTab;
