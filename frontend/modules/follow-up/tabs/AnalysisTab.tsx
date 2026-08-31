/**
 * AnalysisTab
 *
 * Members who need follow-up (missed 3 consecutive services).
 * - Pending tab: members not yet followed up
 * - Followed tab: members who have a follow-up comment saved
 * Consumes shared state via useFollowUp() — no props.
 */

import React, { useState } from 'react';
import { useFollowUp } from '../FollowUpContext';
import { Users, Search, Calendar, Check, ChevronLeft, ChevronRight, Clock, MessageSquare, AlertCircle } from 'lucide-react';

const AnalysisTab: React.FC = () => {
    const {
        analysisData, isLoadingAnalysis, analysisPage, setAnalysisPage, analysisItemsPerPage,
        analysisFilter, setAnalysisFilter,
        viewModeAnalysis, setViewModeAnalysis,
        selectedAnalysisMember, handleViewAnalysisDetail, handleSaveFollowUp,
        memberFormData, setMemberFormData,
    } = useFollowUp();

    // Split data into pending vs followed
    const pendingData = analysisData.filter(r => !r.followUpNotes || r.followUpNotes.trim() === '');
    const followedData = analysisData.filter(r => r.followUpNotes && r.followUpNotes.trim() !== '');
    const filteredData = analysisFilter === 'pending' ? pendingData : followedData;

    const totalPages = Math.max(1, Math.ceil(filteredData.length / analysisItemsPerPage));
    const paginatedData = filteredData.slice((analysisPage - 1) * analysisItemsPerPage, analysisPage * analysisItemsPerPage);

    // ── Detail view ───────────────────────────────────────────────────────────
    if (viewModeAnalysis === 'detail' && selectedAnalysisMember) {
        const isFollowed = !!(memberFormData.followUpNotes && memberFormData.followUpNotes.trim() !== '');
        return (
            <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-in slide-in-from-right-8 duration-300">
                <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                    <button onClick={() => setViewModeAnalysis('list')} className="p-2 hover:bg-gray-100 rounded-full shrink-0">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{selectedAnalysisMember.member.name}</h2>
                        <p className="text-gray-500 text-sm flex items-center mt-0.5">
                            <Users className="w-3.5 h-3.5 mr-1 shrink-0" />
                            <span className="font-mono">{selectedAnalysisMember.member.phone}</span>
                        </p>
                    </div>
                    {isFollowed && (
                        <span className="shrink-0 flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-xs font-bold">
                            <Check className="w-3 h-3" /> Followed
                        </span>
                    )}
                </div>

                {/* Stats — 2-col grid on mobile */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3">
                        <div className="p-2 md:p-3 bg-blue-50 rounded-full shrink-0"><Users className="w-5 h-5 md:w-8 md:h-8 text-blue-600" /></div>
                        <div><p className="text-[10px] md:text-xs uppercase font-bold text-gray-400">Attended</p><p className="text-lg md:text-2xl font-black text-gray-900">{selectedAnalysisMember.attendedCount}</p></div>
                    </div>
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3">
                        <div className="p-2 md:p-3 bg-purple-50 rounded-full shrink-0"><Calendar className="w-5 h-5 md:w-8 md:h-8 text-purple-600" /></div>
                        <div>
                            <p className="text-[10px] md:text-xs uppercase font-bold text-gray-400">Expected</p>
                            <p className="text-lg md:text-2xl font-black text-gray-900">{selectedAnalysisMember.totalServices}</p>
                        </div>
                    </div>
                    <div className="col-span-2 md:col-span-1 bg-ministry-text text-white p-4 md:p-6 rounded-2xl shadow-lg flex items-center gap-3">
                        <div className="p-2 md:p-3 bg-white/10 rounded-full shrink-0"><Calendar className="w-5 h-5 md:w-8 md:h-8 text-white" /></div>
                        <div>
                            <p className="text-[10px] md:text-xs uppercase font-bold text-gray-400">Score</p>
                            <p className="text-2xl md:text-3xl font-black">
                                {selectedAnalysisMember.totalServices > 0
                                    ? Math.round((selectedAnalysisMember.attendedCount / selectedAnalysisMember.totalServices) * 100)
                                    : 0}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {/* Follow-up form */}
                    <form onSubmit={handleSaveFollowUp} className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm space-y-4">
                        <h3 className="font-bold text-base text-gray-800 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-400" /> Follow-Up Note
                        </h3>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Status</label>
                            <select
                                value={memberFormData.followUpStatus || 'Pending'}
                                onChange={e => setMemberFormData({ ...memberFormData, followUpStatus: e.target.value })}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-ministry-blue focus:ring-1 outline-none"
                            >
                                <option value="Pending">Pending</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Resolved">Resolved</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Comment</label>
                            <textarea
                                value={memberFormData.followUpNotes || ''}
                                onChange={e => setMemberFormData({ ...memberFormData, followUpNotes: e.target.value })}
                                placeholder="Enter contact details, prayer requests, or follow-up outcomes..."
                                rows={4}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-ministry-blue focus:ring-1 outline-none resize-none"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Adding a comment will move this member to the <strong>Followed</strong> tab.</p>
                        </div>
                        <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold shadow-sm hover:bg-gray-800 flex items-center justify-center gap-2">
                            <Check className="w-4 h-4" /> Save Follow-Up
                        </button>
                    </form>

                    {/* History */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
                        <h3 className="font-bold text-base text-gray-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Attendance History</h3>
                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                            {selectedAnalysisMember.history.map((record: any, idx: number) => (
                                <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="p-2 rounded-full mr-3 bg-green-100 shrink-0"><Check className="w-4 h-4 text-green-600" /></div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{record.title}</p>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{record.date}</p>
                                    </div>
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
        <div className="md:p-6 animate-in fade-in duration-300">
            <div className="bg-white md:rounded-xl md:shadow-sm md:border md:border-gray-100 overflow-hidden">

                {/* Header */}
                <div className="p-4 md:p-5 border-b border-gray-100 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Search className="w-4 h-4 text-ministry-blue shrink-0" /> Needs Follow Up
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">Members who missed 3 consecutive services.</p>
                        </div>
                        <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100 font-bold text-xs flex items-center gap-1.5 shrink-0">
                            <Users className="w-3.5 h-3.5" /> Total: {analysisData.length}
                        </div>
                    </div>

                    {/* Pending / Followed toggle */}
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => { setAnalysisFilter('pending'); setAnalysisPage(1); }}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap flex items-center gap-1.5 ${analysisFilter === 'pending' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                            Pending
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${analysisFilter === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-500'}`}>{pendingData.length}</span>
                        </button>
                        <button
                            onClick={() => { setAnalysisFilter('followed'); setAnalysisPage(1); }}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap flex items-center gap-1.5 ${analysisFilter === 'followed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            Followed
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${analysisFilter === 'followed' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{followedData.length}</span>
                        </button>
                    </div>
                </div>

                {/* Mobile list */}
                <div className="md:hidden divide-y divide-gray-50">
                    {isLoadingAnalysis ? (
                        <div className="px-4 py-12 flex flex-col items-center text-gray-400">
                            <div className="w-7 h-7 border-4 border-ministry-blue border-t-transparent rounded-full animate-spin mb-3" />
                            Analyzing records...
                        </div>
                    ) : paginatedData.length === 0 ? (
                        <div className="px-4 py-12 flex flex-col items-center text-center">
                            {analysisFilter === 'pending' ? (
                                <>
                                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3"><Check className="w-6 h-6 text-green-600" /></div>
                                    <p className="font-bold text-gray-800">All caught up!</p>
                                    <p className="text-sm text-gray-500 mt-1">No pending follow-ups. Praise God!</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3"><MessageSquare className="w-6 h-6 text-gray-400" /></div>
                                    <p className="font-bold text-gray-800">No followed-up members yet.</p>
                                    <p className="text-sm text-gray-500 mt-1">Add a comment to a pending member to move them here.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        paginatedData.map((record: any) => (
                            <div key={record.id} className="px-4 py-3 flex items-center gap-3 active:bg-gray-50" onClick={() => handleViewAnalysisDetail(record.id, record)}>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs uppercase shrink-0">
                                    {record.name.substring(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900 truncate">{record.name}</p>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{record.phone}</p>
                                </div>
                                {analysisFilter === 'followed' && record.followUpNotes ? (
                                    <div className="shrink-0 max-w-[120px]">
                                        <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Followed</span>
                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{record.followUpNotes}</p>
                                    </div>
                                ) : (
                                    <span className="shrink-0 text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">Pending</span>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs font-bold tracking-wider uppercase border-b border-gray-100">
                                <th className="px-6 py-4">Member Name</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Last Attended</th>
                                <th className="px-6 py-4">Status</th>
                                {analysisFilter === 'followed' && <th className="px-6 py-4">Comment</th>}
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoadingAnalysis ? (
                                <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 border-4 border-ministry-blue border-t-transparent rounded-full animate-spin mb-4" />
                                        Analyzing Attendance Records...
                                    </div>
                                </td></tr>
                            ) : paginatedData.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4"><Check className="w-6 h-6 text-green-600" /></div>
                                        <p className="text-gray-900 font-bold text-lg mb-1">{analysisFilter === 'pending' ? 'No pending follow-ups!' : 'No followed-up members yet.'}</p>
                                        <p className="text-gray-500 text-sm">{analysisFilter === 'pending' ? 'All members have been contacted. Praise God!' : 'Save a comment on a pending member to move them here.'}</p>
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
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-xs text-gray-700">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" /> {record.lastServiceAttended}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${record.followUpStatus === 'Contacted' ? 'bg-green-100 text-green-700 border border-green-200' : record.followUpStatus === 'Resolved' ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                                                {record.followUpStatus || 'Pending'}
                                            </span>
                                        </td>
                                        {analysisFilter === 'followed' && (
                                            <td className="px-6 py-4 text-gray-500 text-sm max-w-[200px]">
                                                <p className="truncate italic">"{record.followUpNotes}"</p>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleViewAnalysisDetail(record.id, record)} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 shadow-sm">View</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-3 md:p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-xs text-gray-500 font-medium">Page {analysisPage} of {totalPages}</span>
                        <div className="flex gap-1.5">
                            <button onClick={() => setAnalysisPage(p => Math.max(1, p - 1))} disabled={analysisPage === 1} className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={() => setAnalysisPage(p => Math.min(totalPages, p + 1))} disabled={analysisPage === totalPages} className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 shadow-sm"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalysisTab;
