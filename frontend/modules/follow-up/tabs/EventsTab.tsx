/**
 * EventsTab
 *
 * Events grid → event detail with souls/confirmations/attendees sub-tabs.
 * Consumes shared state via useFollowUp() — no props.
 */

import React, { useState, useEffect } from 'react';
import { useFollowUp } from '../FollowUpContext';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { isEventLocked } from '../../../utils';
import { MemberStore } from '../../../database/memberStore';
import { SoulsStore } from '../../../database/soulsStore';
import { Calendar, Share2, Check, Plus, Trash2, ChevronLeft, Users } from 'lucide-react';
import * as XLSX from 'xlsx';

const EventsTab: React.FC = () => {
    const { events, souls, selectedEventId, setSelectedEventId, copiedLinkId, handleCopyLink, setShowAddSoulForm } = useFollowUp();
    const { showToast, confirm: showConfirm } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');

    // ── Events grid ───────────────────────────────────────────────────────────
    if (!selectedEventId) {
        const filtered = events.filter(e =>
            e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.location.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return (
            <div className="p-6 space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Ministry Events</h2>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-4 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ministry-orange"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(event => {
                        const isLocked = isEventLocked(event.date);
                        return (
                            <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-ministry-orange/40 transition-all p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-5 h-5 text-gray-400" />
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${isLocked ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-700'}`}>
                                            {isLocked ? 'Complete' : 'Upcoming'}
                                        </span>
                                    </div>
                                </div>
                                <h4 className="text-lg font-bold text-ministry-text mb-1">{event.title}</h4>
                                <p className="text-sm text-gray-500 mb-4">{event.date} • {event.location}</p>
                                <button
                                    onClick={() => setSelectedEventId(event.id)}
                                    className={`w-full py-2 rounded-lg font-bold transition-colors ${isLocked ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-ministry-text text-white hover:bg-ministry-orange'}`}
                                >
                                    {isLocked ? 'View Highlights' : 'View Event'}
                                </button>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && <div className="text-gray-400 col-span-full py-10 text-center">No events found.</div>}
                </div>
            </div>
        );
    }

    // ── Event detail ──────────────────────────────────────────────────────────
    return <EventDetailView eventId={selectedEventId} events={events} souls={souls} onBack={() => setSelectedEventId(null)} copiedLinkId={copiedLinkId} handleCopyLink={handleCopyLink} setShowAddSoulForm={setShowAddSoulForm} showToast={showToast} showConfirm={showConfirm} />;
};

// Self-contained event detail with sub-tab state
const EventDetailView: React.FC<{
    eventId: string; events: any[]; souls: any[]; onBack: () => void;
    copiedLinkId: string | null; handleCopyLink: (id: string) => void;
    setShowAddSoulForm: (v: boolean) => void;
    showToast: any; showConfirm: any;
}> = ({ eventId, events, souls, onBack, copiedLinkId, handleCopyLink, setShowAddSoulForm, showToast, showConfirm }) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return <div className="p-6">Event not found</div>;
    const isLocked = isEventLocked(event.date);
    const eventSouls = souls.filter(s => s.sourceId === eventId);
    const soulsWon = eventSouls.filter(s => s.status !== 'Confirmed');
    const confirmations = eventSouls.filter(s => s.status === 'Confirmed');

    const [viewTab, setViewTab] = useState<'souls' | 'confirmations' | 'attendees' | 'firstTimers'>('souls');
    const [attendees, setAttendees] = useState<any[]>([]);
    const [loadingAttendees, setLoadingAttendees] = useState(false);
    const firstTimers = attendees.filter(a => a.isFirstTime);

    useEffect(() => {
        setLoadingAttendees(true);
        MemberStore.getAttendees(eventId)
            .then(data => setAttendees(data))
            .catch(err => console.error('Failed to load attendees', err))
            .finally(() => setLoadingAttendees(false));
    }, [eventId]);

    const handleDownloadExcel = () => {
        const wb = XLSX.utils.book_new();

        const soulsHeaders = ['First Name', 'Last Name', 'Phone', 'Gender', 'Residence', 'Email', 'Notes', 'Status'];
        const soulsRows = soulsWon.map((s: any) => [s.firstName || '', s.lastName || '', s.phone || '', s.gender || '', s.residence || '', s.email || '', s.notes || '', s.status || '']);
        const wsSouls = XLSX.utils.aoa_to_sheet([soulsHeaders, ...soulsRows]);
        XLSX.utils.book_append_sheet(wb, wsSouls, "Souls Won");

        const confRows = confirmations.map((s: any) => [s.firstName || '', s.lastName || '', s.phone || '', s.gender || '', s.residence || '', s.email || '', s.notes || '', s.status || '']);
        const wsConf = XLSX.utils.aoa_to_sheet([soulsHeaders, ...confRows]);
        XLSX.utils.book_append_sheet(wb, wsConf, "Confirmations");

        const attHeaders = ['Name', 'Phone', 'Gender', 'Residence', 'Status', 'Category'];
        const ftRows = firstTimers.map((a: any) => [a.name, a.phone, a.gender || '', a.residency || '', a.status || '', a.category || '']);
        const wsFt = XLSX.utils.aoa_to_sheet([attHeaders, ...ftRows]);
        XLSX.utils.book_append_sheet(wb, wsFt, "First Timers");

        const attRows = attendees.map((a: any) => [a.name, a.phone, a.gender || '', a.residency || '', a.status || '', a.category || '']);
        const wsAtt = XLSX.utils.aoa_to_sheet([attHeaders, ...attRows]);
        XLSX.utils.book_append_sheet(wb, wsAtt, "All Attendees");

        XLSX.writeFile(wb, `${event.title}_Data.xlsx`);
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-6 h-6 text-gray-600" /></button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
                            {isLocked && <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full border border-gray-200">LOCKED</span>}
                        </div>
                        <p className="text-gray-500 text-sm flex items-center mt-1"><Calendar className="w-4 h-4 mr-1" /> {event.date} • {event.location}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => handleCopyLink(event.id)} className="px-4 py-2 border border-purple-200 text-purple-700 bg-purple-50 rounded-xl text-sm font-bold hover:bg-purple-100 flex items-center shadow-sm">
                        {copiedLinkId === event.id ? <><Check className="w-4 h-4 mr-2" /> Link Copied</> : <><Share2 className="w-4 h-4 mr-2" /> Public Link</>}
                    </button>
                    {!isLocked && (
                        <button onClick={() => setShowAddSoulForm(true)} className="flex items-center space-x-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 shadow-md font-bold">
                            <Plus className="w-5 h-5" /><span>Add Entry</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Souls Won', value: soulsWon.length, cls: 'bg-ministry-text text-white' },
                    { label: 'Confirmations', value: confirmations.length, cls: 'bg-white border border-gray-200', vCls: 'text-blue-600' },
                    { label: 'First Timers', value: firstTimers.length || '-', cls: 'bg-white border border-gray-200', vCls: 'text-purple-600' },
                    { label: 'Total Attendees', value: attendees.length || '-', cls: 'bg-white border border-gray-200', vCls: 'text-green-600' },
                ].map(s => (
                    <div key={s.label} className={`p-5 rounded-xl shadow-sm ${s.cls}`}>
                        <p className="text-xs uppercase font-bold text-gray-400 mb-1">{s.label}</p>
                        <p className={`text-3xl font-black ${s.vCls || ''}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Sub-tabs */}
            <div className="flex justify-between items-center">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
                    {(['souls', 'confirmations', 'firstTimers', 'attendees'] as const).map(t => (
                        <button key={t} onClick={() => setViewTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${viewTab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                            {t === 'souls' ? 'Souls Won' : t === 'confirmations' ? 'Confirmations' : t === 'firstTimers' ? 'First Timers' : 'All Attendees'}
                        </button>
                    ))}
                </div>
                {((viewTab === 'attendees' && attendees.length > 0) || 
                  (viewTab === 'firstTimers' && firstTimers.length > 0) || 
                  (viewTab === 'souls' && soulsWon.length > 0) || 
                  (viewTab === 'confirmations' && confirmations.length > 0)) && (
                    <button onClick={handleDownloadExcel} className="text-sm font-bold text-green-700 hover:bg-green-50 px-3 py-2 rounded-lg flex items-center border border-green-200">
                        Download Excel
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-gray-500 font-bold border-b border-gray-100 uppercase text-xs">
                        {viewTab === 'attendees' || viewTab === 'firstTimers' ? (
                            <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Phone</th><th className="px-6 py-3">Residence</th><th className="px-6 py-3">Gender</th><th className="px-6 py-3">Category</th></tr>
                        ) : (
                            <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Phone</th><th className="px-6 py-3">Residence</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th></tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {viewTab === 'attendees' || viewTab === 'firstTimers' ? (
                            loadingAttendees ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading attendees...</td></tr>
                            ) : (viewTab === 'firstTimers' ? firstTimers : attendees).map((m: any) => (
                                <tr key={m.id} className="hover:bg-gray-50"><td className="px-6 py-3 font-bold text-gray-900">{m.name}</td><td className="px-6 py-3 font-mono text-gray-600">{m.phone}</td><td className="px-6 py-3 text-gray-600">{m.residency}</td><td className="px-6 py-3 text-gray-600">{m.gender}</td><td className="px-6 py-3"><span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">{m.category}</span></td></tr>
                            ))
                        ) : (viewTab === 'souls' ? soulsWon : confirmations).map(soul => (
                            <tr key={soul.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-bold text-gray-900">{soul.firstName} {soul.lastName}</td>
                                <td className="px-6 py-3 font-mono text-gray-600">{soul.phone}</td>
                                <td className="px-6 py-3 text-gray-600">{soul.residence}</td>
                                <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${soul.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{soul.status}</span></td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={async () => {
                                        const confirmed = await showConfirm(<span>Delete <strong>{soul.firstName} {soul.lastName}</strong>?</span>, { title: 'Delete Soul', confirmText: 'Delete', isDestructive: true });
                                        if (confirmed) { try { await SoulsStore.delete(soul.id || ''); showToast('Soul deleted', 'success'); } catch { showToast('Failed', 'error'); } }
                                    }} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {(viewTab === 'attendees' || viewTab === 'firstTimers') && !loadingAttendees && (viewTab === 'firstTimers' ? firstTimers : attendees).length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No {viewTab === 'firstTimers' ? 'first timers' : 'attendees'} recorded yet.</td></tr>
                        )}
                        {(viewTab === 'souls' || viewTab === 'confirmations') && (viewTab === 'souls' ? soulsWon : confirmations).length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No {viewTab} recorded yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EventsTab;
