/**
 * MembersTab
 *
 * Paginated member database with search, profile detail, and edit.
 * Consumes shared state via useFollowUp() — no props.
 */

import React from 'react';
import { useFollowUp } from '../FollowUpContext';
import { Database, Search, ChevronLeft, ChevronRight, Users, Clock, Calendar, Check } from 'lucide-react';

const MembersTab: React.FC = () => {
    const {
        membersDb, totalMembersDb, membersDbQuery, setMembersDbQuery,
        membersDbPage, setMembersDbPage, isSearchingMembersDb, itemsPerPage,
        viewMode, setViewMode,
        selectedMemberDetails, isEditingMember, setIsEditingMember,
        memberFormData, setMemberFormData,
        handleViewMemberDb, handleUpdateMemberDb,
    } = useFollowUp();

    // ── Member detail view ────────────────────────────────────────────────────
    if (viewMode === 'member-detail' && selectedMemberDetails) {
        return (
            <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <button onClick={() => setViewMode('list')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-800 p-2 hover:bg-gray-50 rounded-lg">
                        <ChevronLeft className="w-5 h-5" /><span className="font-bold">Back to Database</span>
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-3 bg-blue-50 rounded-full"><Users className="w-6 h-6 md:w-8 md:h-8 text-blue-600" /></div>
                        <div><p className="text-[10px] md:text-xs uppercase font-bold text-gray-400">Attended</p><p className="text-lg md:text-2xl font-black text-gray-900">{selectedMemberDetails.attendedCount}</p></div>
                    </div>
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-3 bg-purple-50 rounded-full"><Database className="w-6 h-6 md:w-8 md:h-8 text-purple-600" /></div>
                        <div>
                            <p className="text-[10px] md:text-xs uppercase font-bold text-gray-400">Expected</p>
                            <p className="text-lg md:text-2xl font-black text-gray-900">{selectedMemberDetails.totalServices}</p>
                        </div>
                    </div>
                    <div className="col-span-2 md:col-span-1 bg-ministry-text text-white p-4 md:p-6 rounded-2xl shadow-lg flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-3 bg-white/10 rounded-full"><Calendar className="w-6 h-6 md:w-8 md:h-8 text-white" /></div>
                        <div>
                            <p className="text-[10px] md:text-xs uppercase font-bold text-gray-400">Score</p>
                            <p className="text-2xl md:text-3xl font-black">
                                {selectedMemberDetails.totalServices > 0
                                    ? Math.round((selectedMemberDetails.attendedCount / selectedMemberDetails.totalServices) * 100)
                                    : 0}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Profile */}
                    <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h3 className="font-bold text-lg text-gray-800">Member Profile</h3>
                            <button onClick={() => setIsEditingMember(!isEditingMember)} className={`px-4 py-2 rounded-lg text-xs font-bold shadow-sm ${isEditingMember ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'}`}>
                                {isEditingMember ? 'Cancel Editing' : 'Edit Details'}
                            </button>
                        </div>
                        <form onSubmit={handleUpdateMemberDb} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {[
                                    { label: 'Full Name', key: 'name' },
                                    { label: 'Phone', key: 'phone' },
                                    { label: 'Residence', key: 'residence' },
                                    { label: 'Occupation', key: 'occupation' },
                                    { label: 'Place of Work', key: 'placeOfWork' },
                                ].map(f => (
                                    <div key={f.key} className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase">{f.label}</label>
                                        <input disabled={!isEditingMember} value={(memberFormData as any)[f.key]} onChange={e => setMemberFormData({ ...memberFormData, [f.key]: e.target.value })}
                                            className={`w-full p-2.5 bg-gray-50 border rounded-xl text-sm ${!isEditingMember ? 'border-transparent text-gray-600 font-medium' : 'border-gray-200 focus:border-ministry-blue focus:ring-1 bg-white outline-none'}`} />
                                    </div>
                                ))}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                                    <select disabled={!isEditingMember} value={memberFormData.category} onChange={e => setMemberFormData({ ...memberFormData, category: e.target.value })}
                                        className={`w-full p-2.5 bg-gray-50 border rounded-xl text-sm ${!isEditingMember ? 'border-transparent text-gray-600 font-medium appearance-none' : 'border-gray-200 bg-white outline-none'}`}>
                                        <option>First Timer</option><option>Member</option>
                                    </select>
                                </div>
                            </div>
                            {isEditingMember && (
                                <div className="pt-4 flex justify-end">
                                    <button type="submit" className="bg-ministry-text text-white px-6 py-2.5 rounded-xl font-bold hover:bg-ministry-orange shadow-sm">Save Changes</button>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* History */}
                    <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm h-fit">
                        <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-gray-400" /> Recent Activity</h3>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {selectedMemberDetails.history.map((record: any, idx: number) => (
                                <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200">
                                    <div className={`p-2 rounded-full mr-3 ${record.type === 'Service' || !record.type ? 'bg-green-100' : 'bg-purple-100'}`}>
                                        {record.type === 'Service' || !record.type ? <Check className="w-4 h-4 text-green-600" /> : <Calendar className="w-4 h-4 text-purple-600" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{record.title}</p>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{record.date} at {record.checkInTime}</p>
                                    </div>
                                </div>
                            ))}
                            {selectedMemberDetails.history.length === 0 && (
                                <div className="text-center py-10 bg-gray-50 border border-gray-100 border-dashed rounded-xl">
                                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-400 text-sm font-medium">No attendance records found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Members list ──────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(totalMembersDb / itemsPerPage));

    return (
        <div className="md:p-6 animate-in fade-in duration-300">
            <div className="bg-white md:rounded-xl md:shadow-sm md:border md:border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="p-4 md:p-5 border-b border-gray-100 space-y-3">
                    <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center">
                        <Database className="w-5 h-5 mr-2 text-gray-500" />Member Database
                        <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{totalMembersDb}</span>
                    </h3>

                    {/* Search */}
                    <div className="relative w-full">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isSearchingMembersDb ? 'text-ministry-orange animate-pulse' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or tags..."
                            value={membersDbQuery}
                            onChange={e => { setMembersDbQuery(e.target.value); setMembersDbPage(1); }}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ministry-orange"
                        />
                    </div>

                    {/* Pagination */}
                    <div className="flex justify-between items-center">
                        <div className="text-xs md:text-sm text-gray-500">
                            <span className="font-bold text-gray-800">{totalMembersDb === 0 ? 0 : (membersDbPage - 1) * itemsPerPage + 1}–{Math.min(membersDbPage * itemsPerPage, totalMembersDb)}</span> of {totalMembersDb}
                        </div>
                        <div className="flex gap-1.5">
                            <button disabled={membersDbPage === 1} onClick={() => setMembersDbPage(p => Math.max(1, p - 1))} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 font-bold text-xs text-gray-700">
                                <ChevronLeft className="w-4 h-4 inline" /> Prev
                            </button>
                            <button disabled={membersDbPage * itemsPerPage >= totalMembersDb} onClick={() => setMembersDbPage(p => p + 1)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 font-bold text-xs text-gray-700">
                                Next <ChevronRight className="w-4 h-4 inline" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile List */}
                <div className="md:hidden divide-y divide-gray-50">
                    {membersDb.map(member => (
                        <div key={member.id} className="px-4 py-3 flex items-center gap-3 active:bg-gray-50" onClick={() => handleViewMemberDb(member.id)}>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-gray-900 truncate">{member.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                    <span className="font-mono">{member.phone}</span>
                                    <span>·</span>
                                    <span className="truncate">{member.residency || 'N/A'}</span>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 bg-gray-100 text-gray-700">{member.category || 'Member'}</span>
                        </div>
                    ))}
                    {membersDb.length === 0 && !isSearchingMembersDb && (
                        <div className="px-4 py-12 text-center text-gray-400">No members found matching your search.</div>
                    )}
                    {membersDb.length === 0 && isSearchingMembersDb && (
                        <div className="px-4 py-12 text-center font-bold text-ministry-orange animate-pulse">Running extensive database query...</div>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Member Name</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Zone/Cluster</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Data View</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {membersDb.map(member => (
                                <tr key={member.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 group-hover:text-ministry-blue">{member.name}</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">{member.category || 'Member'}</div>
                                    </td>
                                    <td className="px-6 py-4"><span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">{member.category || 'Member'}</span></td>
                                    <td className="px-6 py-4"><div className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block">{member.phone}</div></td>
                                    <td className="px-6 py-4"><div className="text-sm text-gray-700 font-medium">{member.residency || 'N/A'}</div></td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleViewMemberDb(member.id)} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 shadow-sm">View</button>
                                    </td>
                                </tr>
                            ))}
                            {membersDb.length === 0 && !isSearchingMembersDb && (<tr><td colSpan={5} className="py-16 text-center text-gray-400 font-medium">No members found matching your search.</td></tr>)}
                            {membersDb.length === 0 && isSearchingMembersDb && (<tr><td colSpan={5} className="py-16 text-center font-bold text-ministry-orange animate-pulse">Running extensive database query...</td></tr>)}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex justify-center py-3 bg-gray-50 border-t border-gray-100">
                    <div className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">Page {membersDbPage} / {totalPages}</div>
                </div>
            </div>
        </div>
    );
};

export default MembersTab;
