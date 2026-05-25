/**
 * DatabaseTab
 *
 * All souls database with detail view.
 * Consumes shared state via useFollowUp() — no props.
 */

import React from 'react';
import { useFollowUp } from '../FollowUpContext';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { SoulsStore } from '../../../database/soulsStore';
import { SOURCE_TYPE_COLORS } from '../../../constants/ui';
import { Database, Search, ChevronLeft, ChevronRight, Calendar, Clock, User as UserIcon } from 'lucide-react';

const DatabaseTab: React.FC = () => {
    const {
        souls, services, events, isLoading,
        dbEventFilter, setDbEventFilter,
        viewMode, setViewMode,
        selectedSoulDetails, handleViewSoul,
    } = useFollowUp();
    const { showToast, confirm: showConfirm } = useNotification();

    // ── Soul detail view ──────────────────────────────────────────────────────
    if (viewMode === 'soul-detail' && selectedSoulDetails) {
        const { member, attendedCount, totalServices, history } = selectedSoulDetails;
        const score = totalServices > 0 ? Math.round((attendedCount / totalServices) * 100) : 0;
        return (
            <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-in fade-in duration-300">
                <button onClick={() => setViewMode('list')} className="flex items-center text-gray-500 hover:text-ministry-text font-bold transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                    <ChevronLeft className="w-5 h-5 mr-1" /> Back to Souls Database
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 text-blue-600 mb-4"><Database className="w-10 h-10" /></div>
                            <h3 className="text-2xl font-black text-gray-900 mb-1">{member.name}</h3>
                            <p className="text-sm font-bold text-gray-500 mb-6">{member.category}</p>
                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                                <div><p className="text-xs uppercase font-bold text-gray-400">Total Attended</p><p className="text-2xl font-black">{attendedCount}</p></div>
                                <div><p className="text-xs uppercase font-bold text-gray-400">Expected</p><p className="text-2xl font-black">{totalServices}</p></div>
                                <div className="col-span-2 mt-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-xs uppercase font-bold text-gray-400">Attendance Score</p>
                                    <p className="text-3xl font-black text-blue-600">{score}%</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h4 className="text-xs uppercase font-bold text-gray-400 mb-4 flex items-center"><UserIcon className="w-4 h-4 mr-2" />Profile Details</h4>
                            <div className="space-y-4">
                                <div><p className="text-xs text-gray-400">Phone</p><p className="font-bold text-gray-900 font-mono">{member.phone}</p></div>
                                <div><p className="text-xs text-gray-400">Gender</p><p className="font-bold text-gray-900">{member.gender}</p></div>
                                <div><p className="text-xs text-gray-400">Residence</p><p className="font-bold text-gray-900">{member.residency}</p></div>
                                <div><p className="text-xs text-gray-400">Occupation</p><p className="font-bold text-gray-900">{member.occupation || 'N/A'}</p></div>
                                <div><p className="text-xs text-gray-400">Status</p><p className="font-bold text-gray-900">{member.status}</p></div>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center"><Calendar className="w-5 h-5 mr-2 text-gray-400" />Recent Activity</h3>
                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{history.length} records</span>
                        </div>
                        {history.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">No service attendance history found.</div>
                        ) : (
                            <div className="space-y-4">
                                {history.map((record: any, idx: number) => (
                                    <div key={idx} className="flex items-start p-4 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100">
                                        <div className="bg-blue-100 p-2 rounded-lg mr-4"><Calendar className="w-5 h-5 text-blue-600" /></div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">{record.title}</h4>
                                            <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                                                <span>{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <span className="flex items-center font-mono bg-gray-100 px-2 py-0.5 rounded text-xs"><Clock className="w-3 h-3 mr-1" /> {record.checkInTime}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Database list view ────────────────────────────────────────────────────
    const soulsToShow = souls.filter(s => s.status !== 'Confirmed');

    const handleDeleteSoul = async (soul: any) => {
        const confirmed = await showConfirm(
            <span>Delete <strong>{soul.firstName} {soul.lastName}</strong>? This cannot be undone.</span>,
            { title: 'Delete Soul', confirmText: 'Delete', isDestructive: true }
        );
        if (confirmed) {
            try { await SoulsStore.delete(soul.id || ''); showToast('Soul deleted successfully', 'success'); }
            catch { showToast('Failed to delete soul', 'error'); }
        }
    };

    return (
        <div className="md:p-6 animate-in fade-in duration-300">
            <div className="bg-white md:rounded-xl md:shadow-sm md:border md:border-gray-100 overflow-hidden">
                <div className="p-4 md:p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <Database className="w-5 h-5 mr-2 text-gray-500" />
                        All Souls
                        <span className="ml-3 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{soulsToShow.length}</span>
                    </h2>
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <select value={dbEventFilter} onChange={e => setDbEventFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ministry-orange bg-white w-full md:min-w-[200px]">
                            <option value="">All Events & Services</option>
                            <optgroup label="Services">{services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>
                            <optgroup label="Events">{events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</optgroup>
                        </select>
                    </div>
                </div>

                {/* Mobile List */}
                <div className="md:hidden divide-y divide-gray-50">
                    {soulsToShow.map(soul => (
                        <div key={soul.id} className="px-4 py-3 flex items-center gap-3 active:bg-gray-50" onClick={() => handleViewSoul(soul.id || '')}>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-gray-900 truncate">{soul.firstName} {soul.lastName}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                    <span className="font-mono">{soul.phone}</span>
                                    <span>·</span>
                                    <span className="truncate">{soul.residence}</span>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${soul.status === 'New' ? 'bg-blue-50 text-blue-700' : soul.status === 'Integrated' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{soul.status}</span>
                        </div>
                    ))}
                    {soulsToShow.length === 0 && (
                        <div className="px-4 py-12 text-center text-gray-400">No database records found.</div>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Name</th><th className="px-6 py-3">Details</th>
                                <th className="px-6 py-3">Source</th><th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Date</th><th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {soulsToShow.map(soul => (
                                <tr key={soul.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4"><div className="font-bold text-gray-900">{soul.firstName} {soul.lastName}</div></td>
                                    <td className="px-6 py-4"><div className="text-gray-600">{soul.phone}</div><div className="text-xs text-gray-400 mt-0.5">{soul.residence}</div></td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SOURCE_TYPE_COLORS[soul.sourceType as keyof typeof SOURCE_TYPE_COLORS] || 'bg-gray-100 text-gray-800'}`}>{soul.sourceType}</span>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {soul.sourceType === 'Residential' ? 'Residential Area' : soul.sourceType === 'Healing Dept' ? (soul.notes?.replace('Healing Outreach: ', '') || 'Hospital Outreach') : soul.sourceType === 'Campus' ? (soul.campusCategory || 'Campus Outreach') : ((soul.sourceType === 'Event' ? events : services).find(e => e.id === soul.sourceId)?.title) || 'Unknown Source'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${soul.status === 'New' ? 'bg-blue-50 text-blue-700' : soul.status === 'Integrated' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{soul.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{new Date(soul.createdAt || '').toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => handleViewSoul(soul.id || '')} className="text-gray-400 hover:text-green-600 p-1" title="View Details"><Search className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteSoul(soul)} className="text-gray-400 hover:text-red-600 p-1"><span className="sr-only">Delete</span>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                            {soulsToShow.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No database records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 md:p-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                    <span>Showing {soulsToShow.length} results</span>
                    <div className="flex gap-2">
                        <button disabled className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
                        <button disabled className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatabaseTab;
