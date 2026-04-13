/**
 * AnalysisTab
 *
 * Members who need follow-up (missed 3 consecutive services).
 * Shows list + detail with follow-up status tracking form.
 * Consumes shared state via useFollowUp() — no props.
 */

import React from 'react';
import { useFollowUp } from '../FollowUpContext';
import { Users, Search, Calendar, Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const AnalysisTab: React.FC = () => {
    const {
        analysisData, isLoadingAnalysis, analysisPage, setAnalysisPage, analysisItemsPerPage,
        viewModeAnalysis, setViewModeAnalysis,
        selectedAnalysisMember, handleViewAnalysisDetail, handleSaveFollowUp,
        memberFormData, setMemberFormData,
    } = useFollowUp();

    const totalAnalysisPages = Math.ceil(analysisData.length / analysisItemsPerPage);
    const paginatedData = analysisData.slice((analysisPage - 1) * analysisItemsPerPage, analysisPage * analysisItemsPerPage);

    // ── Detail view ───────────────────────────────────────────────────────────
    if (viewModeAnalysis === 'detail' && selectedAnalysisMember) {
        return (
            <div className="p-6 space-y-6 animate-in slide-in-from-right-8 duration-300">
                <div className="flex items-center space-x-4 border-b border-gray-100 pb-4">
                    <button onClick={() => setViewModeAnalysis('list')} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-6 h-6 text-gray-600" /></button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedAnalysisMember.member.name}</h2>
                        <p className="text-gray-500 text-sm flex items-center mt-1"><Users className="w-4 h-4 mr-1" /> {selectedAnalysisMember.member.phone}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-full"><Users className="w-8 h-8 text-blue-600" /></div>
                        <div><p className="text-xs uppercase font-bold text-gray-400">Total Attended</p><p className="text-2xl font-black text-gray-900">{selectedAnalysisMember.attendedCount} Services</p></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                        <div className="p-3 bg-purple-50 rounded-full"><Calendar className="w-8 h-8 text-purple-600" /></div>
                        <div>
                            <p className="text-xs uppercase font-bold text-gray-400">Expected Services</p>
                            <p className="text-2xl font-black text-gray-900">{selectedAnalysisMember.totalServices} Held</p>
                            <p className="text-xs text-gray-500">Since Joined ({new Date(selectedAnalysisMember.member.joinedDate || '').toLocaleDateString()})</p>
                        </div>
                    </div>
                    <div className="bg-ministry-text text-white p-6 rounded-2xl shadow-lg flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-full"><Calendar className="w-8 h-8 text-white" /></div>
                        <div>
                            <p className="text-xs uppercase font-bold text-gray-400">Attendance Score</p>
                            <p className="text-3xl font-black">
                                {selectedAnalysisMember.totalServices > 0
                                    ? Math.round((selectedAnalysisMember.attendedCount / selectedAnalysisMember.totalServices) * 100)
                                    : 0}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Follow-up form */}
                    <div className="space-y-6">
                        <form onSubmit={handleSaveFollowUp} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">Follow Up Status</label>
                                <select value={memberFormData.followUpStatus || 'Pending'} onChange={e => setMemberFormData({ ...memberFormData, followUpStatus: e.target.value })} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-ministry-blue focus:ring-1 focus:ring-ministry-blue outline-none">
                                    <option value="Pending">Pending</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Resolved">Resolved</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-2">Follow Up Comments</label>
                                <textarea value={memberFormData.followUpNotes || ''} onChange={e => setMemberFormData({ ...memberFormData, followUpNotes: e.target.value })} placeholder="Enter contact details, prayer requests, or follow up outcomes..." rows={4} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-ministry-blue focus:ring-1 outline-none block resize-none" />
                            </div>
                            <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold shadow-sm hover:bg-gray-800">Save Follow Up</button>
                        </form>
                    </div>

                    {/* History */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-gray-400" /> Attendance History</h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {selectedAnalysisMember.history.map((record: any, idx: number) => (
                                <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="p-2 rounded-full mr-3 bg-green-100"><Check className="w-4 h-4 text-green-600" /></div>
                                    <div><p className="text-sm font-bold text-gray-900">{record.title}</p><p className="text-xs text-gray-500 font-mono mt-0.5">{record.date}</p></div>
                                </div>
                            ))}
                            {selectedAnalysisMember.history.length === 0 && (
                                <div className="text-center py-6 text-gray-400 text-sm">No recent attendance.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── List view ─────────────────────────────────────────────────────────────
    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Search className="w-6 h-6 text-ministry-blue" />Needs Follow Up</h2>
                    <p className="text-sm font-medium text-gray-500 mt-1">Tracking members who missed the 3 most recent consecutive services.</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 font-bold text-sm shadow-sm flex items-center gap-2">
                    <Users className="w-4 h-4" /> Total: {analysisData.length}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs font-bold tracking-wider uppercase border-b border-gray-100">
                            <th className="px-6 py-4">Member Name</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4 border-l border-gray-100">Last Service Attended</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoadingAnalysis ? (
                            <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-ministry-blue border-t-transparent rounded-full animate-spin mb-4" />
                                    Analyzing Attendance Records...
                                </div>
                            </td></tr>
                        ) : analysisData.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-16 text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4"><Check className="w-6 h-6 text-green-600" /></div>
                                    <p className="text-gray-900 font-bold text-lg mb-1">No missed attendances detected</p>
                                    <p className="text-gray-500 font-medium text-sm">All known members have attended recently. Praise God!</p>
                                </div>
                            </td></tr>
                        ) : (
                            paginatedData.map((record: any) => (
                                <tr key={record.id} className="hover:bg-gray-50/80 group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs uppercase shadow-sm">{record.name.substring(0, 2)}</div>
                                            <span className="font-bold text-gray-900 group-hover:text-ministry-blue">{record.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">{record.phone}</td>
                                    <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap border-l border-gray-50/50">
                                        <span className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-xs text-gray-700 shadow-sm">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" /> {record.lastServiceAttended}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${record.followUpStatus === 'Contacted' ? 'bg-green-100 text-green-700 border border-green-200' : record.followUpStatus === 'Resolved' ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                                            {record.followUpStatus || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleViewAnalysisDetail(record.id, record)} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 shadow-sm">View</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {totalAnalysisPages > 1 && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center rounded-b-xl">
                        <span className="text-sm text-gray-500 font-medium">Page {analysisPage} of {totalAnalysisPages}</span>
                        <div className="flex space-x-2">
                            <button onClick={() => setAnalysisPage(p => Math.max(1, p - 1))} disabled={analysisPage === 1} className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={() => setAnalysisPage(p => Math.min(totalAnalysisPages, p + 1))} disabled={analysisPage === totalAnalysisPages} className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 shadow-sm"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalysisTab;
