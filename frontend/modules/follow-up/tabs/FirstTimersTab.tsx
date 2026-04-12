/**
 * FirstTimersTab
 *
 * First timer database with services/events sub-tabs and detail view.
 * Consumes shared state via useFollowUp() — no props.
 */

import React, { useState, useEffect } from 'react';
import { useFollowUp } from '../FollowUpContext';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { MemberStore } from '../../../database/memberStore';
import * as XLSX from 'xlsx';
import { Users, Search, Calendar, Clock, ChevronLeft, User as UserIcon } from 'lucide-react';

const FirstTimersTab: React.FC = () => {
    const { } = useFollowUp();
    const { showToast } = useNotification();

    const [subTab, setSubTab] = useState<'services' | 'events'>('services');
    const [firstTimers, setFirstTimers] = useState<{ services: any[]; events: any[] }>({ services: [], events: [] });
    const [loadingFT, setLoadingFT] = useState(false);
    const [viewModeFT, setViewModeFT] = useState<'list' | 'detail'>('list');
    const [selectedFTDetails, setSelectedFTDetails] = useState<any | null>(null);

    useEffect(() => {
        setLoadingFT(true);
        MemberStore.getFirstTimers().then(data => {
            setFirstTimers({
                services: [...data.services].sort((a, b) => new Date(b.check_in_time || 0).getTime() - new Date(a.check_in_time || 0).getTime()),
                events: [...data.events].sort((a, b) => new Date(b.check_in_time || 0).getTime() - new Date(a.check_in_time || 0).getTime())
            });
        }).finally(() => setLoadingFT(false));
    }, []);

    const currentData = subTab === 'services' ? firstTimers.services : firstTimers.events;

    const handleDownloadFT = () => {
        const exportData = currentData.map(ft => ({
            'Name': ft.name, 'Phone': ft.phone, 'Gender': ft.gender, 'Residence': ft.residency,
            'Source Event Date': ft.check_in_time ? new Date(ft.check_in_time).toLocaleDateString() : 'Unknown',
            'Source Event Title': ft.source_event_title || 'Unknown Source'
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'First Timers');
        XLSX.writeFile(wb, `FirstTimers_${subTab}.xlsx`);
    };

    const handleViewFirstTimer = async (id: string) => {
        setLoadingFT(true);
        try {
            const details = subTab === 'services'
                ? await MemberStore.getMemberDetails(id)
                : await (MemberStore as any).getPassengerDetails(id);
            setSelectedFTDetails(details);
            setViewModeFT('detail');
        } catch { showToast('Failed to load first timer details', 'error'); }
        finally { setLoadingFT(false); }
    };

    // ── Detail view ───────────────────────────────────────────────────────────
    if (viewModeFT === 'detail' && selectedFTDetails) {
        const { member, attendedCount, totalServices, history } = selectedFTDetails;
        const score = totalServices > 0 ? Math.round((attendedCount / totalServices) * 100) : 0;
        return (
            <div className="p-6 space-y-6 animate-in fade-in duration-300">
                <button onClick={() => setViewModeFT('list')} className="flex items-center text-gray-500 hover:text-ministry-text font-bold bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                    <ChevronLeft className="w-5 h-5 mr-1" /> Back to Database
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 text-blue-600 mb-4"><UserIcon className="w-10 h-10" /></div>
                            <h3 className="text-2xl font-black text-gray-900 mb-1">{member.name}</h3>
                            <p className="text-sm font-bold text-gray-500 mb-6">{member.category || 'First Timer'}</p>
                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                                <div><p className="text-xs uppercase font-bold text-gray-400">Total Attended</p><p className="text-2xl font-black">{attendedCount}</p></div>
                                <div><p className="text-xs uppercase font-bold text-gray-400">Expected</p><p className="text-2xl font-black">{totalServices}</p></div>
                                <div className="col-span-2 mt-2 bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
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
                                <div><p className="text-xs text-gray-400">Status</p><p className="font-bold text-gray-900">{member.status}</p></div>
                                <div><p className="text-xs text-gray-400">Joined</p><p className="font-bold text-gray-900">{member.joinedDate ? new Date(member.joinedDate).toLocaleDateString() : 'N/A'}</p></div>
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

    // ── List view ─────────────────────────────────────────────────────────────
    return (
        <div className="p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-gray-500" />
                        First Timer Database
                        <span className="ml-3 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">{currentData.length}</span>
                    </h2>
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                        <button onClick={() => setSubTab('services')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${subTab === 'services' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Services</button>
                        <button onClick={() => setSubTab('events')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${subTab === 'events' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Events</button>
                    </div>
                    <button onClick={handleDownloadFT} disabled={loadingFT || currentData.length === 0} className="text-sm font-bold text-green-700 hover:bg-green-50 px-3 py-2 rounded-lg flex items-center border border-green-200 disabled:opacity-50">Download Excel</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Residence</th><th className="px-6 py-3">Source Event</th><th className="px-6 py-3">Date Recorded</th><th className="px-6 py-3 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loadingFT ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading database...</td></tr>
                            ) : currentData.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No first timers found for {subTab}.</td></tr>
                            ) : (
                                currentData.map(ft => (
                                    <tr key={ft.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{ft.name}</td>
                                        <td className="px-6 py-4 text-gray-600 font-mono">{ft.phone}</td>
                                        <td className="px-6 py-4 text-gray-600">{ft.residency}</td>
                                        <td className="px-6 py-4 text-gray-600">{ft.source_event_title}</td>
                                        <td className="px-6 py-4 text-gray-500">{ft.check_in_time ? new Date(ft.check_in_time).toLocaleDateString() : 'Unknown'}</td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button onClick={() => handleViewFirstTimer(ft.id)} className="text-gray-400 hover:text-green-600 p-1" title="View Details & Attendance"><Search className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FirstTimersTab;
