import React, { useState, useEffect } from 'react';
import { useSafeAsync } from '../hooks/useSafeAsync';
import { useNotification } from './ui/NotificationSystem';
import { supabase } from '../services/supabaseClient';
import { Users, Calendar, Database, Plus, Search, Link as LinkIcon, Share2, Copy, Check, Filter, ChevronLeft, ChevronRight, X, Trash2, Pencil } from 'lucide-react';
import { MinistryEvent, Soul, Member, ModalType, User } from '../types';
import { isEventLocked, isServiceClosed } from '../utils';
import { EventStore } from '../database/eventStore';
import { SoulsStore } from '../database/soulsStore';
import { MemberStore } from '../database/memberStore';
import SoulEntryForm from './SoulEntryForm';
import MemberSearchInput from './MemberSearchInput';

type Tab = 'services' | 'events' | 'database';


interface FollowUpDashboardProps {
    onOpenModal?: (type: ModalType) => void;
    currentUser: User;
}

const FollowUpDashboard: React.FC<FollowUpDashboardProps> = ({ onOpenModal, currentUser }) => {
    const { showToast, confirm: showConfirm } = useNotification();
    const [activeTab, setActiveTab] = useState<Tab>('services');
    const [events, setEvents] = useState<MinistryEvent[]>([]);
    const [services, setServices] = useState<MinistryEvent[]>([]);
    const [souls, setSouls] = useState<Soul[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isMember = currentUser.role === 'Member';
    const canViewDatabase = !isMember;

    // Selection State

    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [showAddSoulForm, setShowAddSoulForm] = useState(false);

    // Link Copy State
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

    // Search & Edit State
    const [searchQuery, setSearchQuery] = useState('');
    const [editingSoul, setEditingSoul] = useState<Soul | null>(null);

    // Member Search State
    const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
    const [isSearchingMembers, setIsSearchingMembers] = useState(false);

    // Debounce Search
    // Safe Async Search
    const searchRequest = useSafeAsync<Member[]>();

    useEffect(() => {
        if (searchQuery.length < 3) {
            setMemberSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            searchRequest.run(async (signal) => {
                setIsSearchingMembers(true);
                // Pass signal to query if supported, or just use wrapper cancellation
                const response = await MemberStore.getMembers(1, 10, searchQuery);
                return response.status === 'success' ? response.data : [];
            }).then((data) => {
                setIsSearchingMembers(false);
                if (data) {
                    setMemberSearchResults(data);
                }
            });
        }, 500);

        return () => {
            clearTimeout(delayDebounceFn);
            searchRequest.cancel();
        };
    }, [searchQuery]);

    useEffect(() => {
        loadData();

        const channel = supabase.channel('followup-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'souls' }, () => loadData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ministry_events' }, () => loadData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const eventsResp = await EventStore.getAll();
            const allEvents = eventsResp.status === 'success' ? eventsResp.data : [];

            setEvents(allEvents.filter(e => e.type === 'Event'));
            setServices(allEvents.filter(e => e.type === 'Service'));

            const allSouls = await SoulsStore.getAll();
            setSouls(allSouls);
        } catch (e) {
            console.error("Failed to load dashboard data", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = (eventId: string) => {
        const link = `${window.location.origin}/collect-souls/${eventId}`; // Public Route
        navigator.clipboard.writeText(link);
        setCopiedLinkId(eventId);
        setTimeout(() => setCopiedLinkId(null), 2000);
    };

    const handleAddSoul = async (soulData: Omit<Soul, 'id' | 'createdAt'>) => {
        // Validation: Ensure Event ID is present
        if (!soulData.eventId && (soulData.sourceType === 'Event' || soulData.sourceType === 'Service')) {
            showToast("Please select an event or service first.", 'error');
            return;
        }
        try {
            if (editingSoul) {
                // UPDATE Existing
                await SoulsStore.update({ ...soulData, id: editingSoul.id, createdAt: editingSoul.createdAt } as Soul);
                showToast("Soul updated successfully", 'success');
            } else {
                // CREATE New
                await SoulsStore.add(soulData as Soul);
                showToast("Soul added successfully", 'success');
            }
            // Refresh
            await loadData();
            setShowAddSoulForm(false);
            setEditingSoul(null);
        } catch (e) {
            console.error("Failed to save soul", e);
            showToast("Failed to save. Please try again.", 'error');
        }
    };

    // --- SUB-COMPONENTS ---

    const ServicesList = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Recent Services</h2>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search services..."
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ministry-orange"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                    <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden">
                        <div className="p-5 border-b border-gray-50 flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold text-ministry-orange uppercase tracking-wider">Service</span>
                                <h3 className="text-lg font-bold text-gray-900 mt-1">{service.title}</h3>
                                <div className="flex items-center text-gray-500 text-sm mt-2">
                                    <Calendar className="w-3.5 h-3.5 mr-1" />
                                    {service.date}
                                    {isServiceClosed(service.date) && <span className="ml-2 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold border border-gray-200">LOCKED</span>}
                                </div>
                            </div>
                            <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                                {souls.filter(s => s.sourceId === service.id).length} Souls
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50/50 flex justify-between items-center">
                            <button
                                onClick={() => setSelectedEventId(service.id)}
                                className="flex-1 bg-ministry-text text-white py-2 rounded-lg text-sm font-bold hover:bg-ministry-orange transition-colors flex items-center justify-center shadow-sm"
                            >
                                Open Service
                            </button>
                        </div>
                    </div>
                ))}
                {services.length === 0 && <div className="text-gray-400 col-span-full text-center py-10">No services found.</div>}
            </div>
        </div>
    );





    /** UPDATED EVENT DETAIL VIEW WITH ATTENDEES TAB */
    const EventDetailView = () => {
        const event = events.find(e => e.id === selectedEventId);
        if (!event) return <div>Event not found</div>;

        const isLocked = isEventLocked(event.date);

        const eventSouls = souls.filter(s => s.sourceId === selectedEventId);
        const soulsWon = eventSouls.filter(s => s.status !== 'Confirmed');
        const confirmations = eventSouls.filter(s => s.status === 'Confirmed');

        const [viewTab, setViewTab] = useState<'souls' | 'confirmations' | 'attendees'>('souls');
        const [attendees, setAttendees] = useState<Member[]>([]);
        const [loadingAttendees, setLoadingAttendees] = useState(false);

        // Load Attendees on load
        useEffect(() => {
            if (selectedEventId) {
                setLoadingAttendees(true);
                MemberStore.getAttendees(selectedEventId)
                    .then(data => setAttendees(data))
                    .catch(err => console.error("Failed to load attendees", err))
                    .finally(() => setLoadingAttendees(false));
            }
        }, [selectedEventId]);

        const handleDownloadExcel = () => {
            // CSV Generation
            const headers = ['Name', 'Phone', 'Gender', 'Residence', 'Status', 'Category'];
            const rows = attendees.map(a => [
                a.name,
                a.phone,
                a.gender,
                a.residency,
                a.status,
                a.category || ''
            ]);

            const csvContent = "data:text/csv;charset=utf-8,"
                + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `${event.title}_Attendees.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setSelectedEventId(null)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
                                {isLocked && <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full border border-gray-200">LOCKED</span>}
                            </div>
                            <p className="text-gray-500 text-sm flex items-center mt-1">
                                <Calendar className="w-4 h-4 mr-1" /> {event.date} • {event.location}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {/* Existing Buttons */}
                        <button
                            onClick={() => handleCopyLink(event.id)}
                            className="px-4 py-2 border border-purple-200 text-purple-700 bg-purple-50 rounded-xl text-sm font-bold hover:bg-purple-100 transition-colors flex items-center shadow-sm"
                        >
                            {copiedLinkId === event.id ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" /> Link Copied
                                </>
                            ) : (
                                <>
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Public Link
                                </>
                            )}
                        </button>
                        {!isLocked && (
                            <button
                                onClick={() => setShowAddSoulForm(true)}
                                className="flex items-center space-x-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-colors shadow-md font-bold"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Add Entry</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-ministry-text text-white p-5 rounded-xl shadow-sm">
                        <p className="text-xs uppercase font-bold text-gray-400 mb-1">Total Souls Won</p>
                        <p className="text-3xl font-black">{soulsWon.length}</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                        <p className="text-xs uppercase font-bold text-gray-500 mb-1">Confirmations</p>
                        <p className="text-3xl font-black text-blue-600">{confirmations.length}</p>
                    </div>
                    {/* New Attendees Card */}
                    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                        <p className="text-xs uppercase font-bold text-gray-500 mb-1">Total Attendees</p>
                        <p className="text-3xl font-black text-green-600">{attendees.length > 0 ? attendees.length : '-'}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-between items-center">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setViewTab('souls')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewTab === 'souls' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Souls Won
                        </button>
                        <button
                            onClick={() => setViewTab('confirmations')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewTab === 'confirmations' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Confirmations
                        </button>
                        <button
                            onClick={() => setViewTab('attendees')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewTab === 'attendees' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Attendees
                        </button>
                    </div>

                    {viewTab === 'attendees' && attendees.length > 0 && (
                        <button
                            onClick={handleDownloadExcel}
                            className="text-sm font-bold text-green-700 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors flex items-center border border-green-200"
                        >
                            Download Excel
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-gray-500 font-bold border-b border-gray-100 uppercase text-xs">
                            {viewTab === 'attendees' ? (
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Phone</th>
                                    <th className="px-6 py-3">Residence</th>
                                    <th className="px-6 py-3">Gender</th>
                                    <th className="px-6 py-3">Category</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Phone</th>
                                    <th className="px-6 py-3">Residence</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {viewTab === 'attendees' ? (
                                loadingAttendees ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading attendees...</td></tr>
                                ) :
                                    attendees.map(member => (
                                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 font-bold text-gray-900">{member.name}</td>
                                            <td className="px-6 py-3 text-gray-600 font-mono">{member.phone}</td>
                                            <td className="px-6 py-3 text-gray-600">{member.residency}</td>
                                            <td className="px-6 py-3 text-gray-600">{member.gender}</td>
                                            <td className="px-6 py-3 text-gray-500">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${member.category === 'Student' ? 'bg-indigo-100 text-indigo-700' :
                                                    member.category === 'Institution' ? 'bg-cyan-100 text-cyan-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {member.category}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                            ) : (
                                (viewTab === 'souls' ? soulsWon : confirmations).map(soul => (
                                    <tr key={soul.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-bold text-gray-900">{soul.firstName} {soul.lastName}</td>
                                        <td className="px-6 py-3 text-gray-600 font-mono">{soul.phone}</td>
                                        <td className="px-6 py-3 text-gray-600">{soul.residence}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${soul.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                {soul.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={async () => {
                                                    const confirmed = await showConfirm(
                                                        <span>Are you sure you want to delete <strong>{soul.firstName} {soul.lastName}</strong>? This cannot be undone.</span>,
                                                        { title: 'Delete Soul', confirmText: 'Delete', isDestructive: true }
                                                    );
                                                    if (confirmed) {
                                                        try {
                                                            await SoulsStore.delete(soul.id || '');
                                                            showToast('Soul deleted successfully', 'success');
                                                            loadData();
                                                        } catch (e) {
                                                            showToast('Failed to delete soul', 'error');
                                                        }
                                                    }
                                                }}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                title="Delete Soul"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )))
                            }

                            {/* Empty States */}
                            {viewTab === 'attendees' && !loadingAttendees && attendees.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                                        No attendees recorded yet.
                                    </td>
                                </tr>
                            )}
                            {(viewTab !== 'attendees' && (viewTab === 'souls' ? soulsWon : confirmations).length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                                        No {viewTab} recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };


    const EventsList = () => {
        const [searchTerm, setSearchTerm] = useState('');

        const filteredEvents = events.filter(e =>
            e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.location.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Ministry Events</h2>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ministry-orange"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map(event => {
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
                                <p className="text-sm text-gray-500 mb-4 flex items-center">
                                    {event.date} • <span className="ml-1">{event.location}</span>
                                </p>
                                <button
                                    onClick={() => setSelectedEventId(event.id)}
                                    className={`w-full py-2 rounded-lg font-bold transition-colors ${isLocked ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-ministry-text text-white hover:bg-ministry-orange'}`}
                                >
                                    {isLocked ? 'View Highlights' : 'View Event'}
                                </button>
                            </div>
                        );
                    })}
                    {filteredEvents.length === 0 && <div className="text-gray-400 col-span-full py-10 text-center">No events found.</div>}
                </div>
            </div>
        );
    };

    const SoulsDatabase = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center">
                    <Database className="w-5 h-5 mr-2 text-gray-500" />
                    All Souls
                    <span className="ml-3 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{souls.filter(s => s.status !== 'Confirmed').length}</span>
                </h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Details</th>
                            <th className="px-6 py-3">Source</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {souls.filter(s => s.status !== 'Confirmed').map(soul => (
                            <tr key={soul.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{soul.firstName} {soul.lastName}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-gray-600">{soul.phone}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{soul.residence}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${soul.sourceType === 'Healing Dept'
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {soul.sourceType}
                                    </span>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {soul.sourceType === 'Healing Dept'
                                            ? (soul.notes?.replace('Healing Outreach: ', '') || 'Hospital Outreach')
                                            : ((soul.sourceType === 'Event' ? events : services).find(e => e.id === soul.sourceId)?.title) || 'Unknown Source'
                                        }
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${soul.status === 'New' ? 'bg-blue-50 text-blue-700' :
                                            soul.status === 'Integrated' ? 'bg-green-50 text-green-700' :
                                                'bg-gray-100 text-gray-700'}`}>
                                        {soul.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {new Date(soul.createdAt || '').toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={async () => {
                                            const confirmed = await showConfirm(
                                                <span>Are you sure you want to delete <strong>{soul.firstName} {soul.lastName}</strong>? This cannot be undone.</span>,
                                                { title: 'Delete Soul', confirmText: 'Delete', isDestructive: true }
                                            );
                                            if (confirmed) {
                                                try {
                                                    await SoulsStore.delete(soul.id || '');
                                                    showToast('Soul deleted successfully', 'success');
                                                    loadData();
                                                } catch (e) {
                                                    showToast('Failed to delete soul', 'error');
                                                }
                                            }
                                        }}
                                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                        title="Delete Soul"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {souls.filter(s => s.status !== 'Confirmed').length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                    No database records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Simple Pagination Placeholder */}
            <div className="p-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                <span>Showing {souls.length} results</span>
                <div className="flex gap-2">
                    <button disabled className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
                    <button disabled className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
                </div>
            </div>
        </div >
    );

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 min-h-screen pb-24">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                        Follow-up & Souls
                    </h1>
                    <p className="text-gray-500 mt-1">Manage converts, track outreach, and integrate new members.</p>
                </div>
            </div>

            {/* Navigation Tabs - Registration Theme */}
            <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit overflow-x-auto">
                <button
                    onClick={() => {
                        setActiveTab('services');
                        setSelectedEventId(null);
                    }}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'services' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Calendar className={`w-4 h-4 ${activeTab === 'services' ? 'text-ministry-neon' : ''}`} />
                    <span>Services</span>
                </button>
                <button
                    onClick={() => {
                        setActiveTab('events');
                        setSelectedEventId(null);
                    }}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'events' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Users className={`w-4 h-4 ${activeTab === 'events' ? 'text-ministry-neon' : ''}`} />
                    <span>Events</span>
                </button>
                {canViewDatabase && (
                    <button
                        onClick={() => {
                            setActiveTab('database');
                            setSelectedEventId(null);
                        }}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'database' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Database className={`w-4 h-4 ${activeTab === 'database' ? 'text-ministry-neon' : ''}`} />
                        <span>Souls Database</span>
                    </button>
                )}
            </div>

            {/* Main Content Area */}
            <div className="bg-ministry-card border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center text-gray-400">Loading data...</div>
                ) : (
                    <>
                        {selectedEventId && activeTab === 'services' ? (
                            /* INLINED ServiceDetailView Content to fix Focus Loss */
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                    <div className="flex items-center space-x-4">
                                        <button
                                            onClick={() => setSelectedEventId(null)}
                                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                        >
                                            <ChevronLeft className="w-6 h-6 text-gray-600" />
                                        </button>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">{services.find(s => s.id === selectedEventId)?.title}</h2>
                                            <p className="text-gray-500 text-sm flex items-center mt-1">
                                                <Calendar className="w-4 h-4 mr-1" /> {services.find(s => s.id === selectedEventId)?.date}
                                                {selectedEventId && isServiceClosed(services.find(s => s.id === selectedEventId)?.date || '') && <span className="ml-2 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full border border-gray-200 font-bold">LOCKED</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Registration-Style Search Interface */}

                                {/* Search and Edit Logic */}
                                <div className="relative group z-50">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all shadow-sm"
                                        placeholder="Search member by name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />

                                    {/* Global Search Results Dropdown */}
                                    {searchQuery.length > 2 && (memberSearchResults.length > 0 || isSearchingMembers) && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {isSearchingMembers ? (
                                                <div className="p-4 text-center text-gray-400 text-sm">Searching global database...</div>
                                            ) : (
                                                <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                                                    {memberSearchResults.map(member => {
                                                        const isAlreadyAdded = souls.some(s => s.sourceId === selectedEventId && (
                                                            (s.phone && member.phone && s.phone === member.phone) ||
                                                            (s.firstName + ' ' + s.lastName === member.name)
                                                        ));

                                                        return (
                                                            <div key={member.id} className="p-3 hover:bg-gray-50 flex justify-between items-center transition-colors">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-bold text-gray-800">{member.name}</p>
                                                                        {member.status === 'Checked In' && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full border border-green-100 font-bold">Checked In</span>}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">{member.phone} • {member.residency}</p>
                                                                </div>
                                                                <div>
                                                                    {isAlreadyAdded ? (
                                                                        <span className="text-xs font-bold text-gray-400 flex items-center bg-gray-100 px-2 py-1 rounded">
                                                                            <Check className="w-3 h-3 mr-1" /> Added
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => {
                                                                                // Add as Soul
                                                                                handleAddSoul({
                                                                                    firstName: member.name.split(' ')[0],
                                                                                    lastName: member.name.split(' ').slice(1).join(' '),
                                                                                    phone: member.phone,
                                                                                    gender: member.gender,
                                                                                    residence: member.residency,
                                                                                    email: '',
                                                                                    status: 'New',
                                                                                    notes: 'From Member Database',
                                                                                    sourceType: activeTab === 'events' ? 'Event' : 'Service',
                                                                                    sourceId: selectedEventId || '',
                                                                                    eventId: selectedEventId || undefined,
                                                                                    capturedBy: currentUser.id
                                                                                });
                                                                                setSearchQuery(''); // Clear search to reset view
                                                                            }}
                                                                            className="text-xs bg-ministry-orange text-white px-3 py-1.5 rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-sm flex items-center"
                                                                        >
                                                                            <Plus className="w-3 h-3 mr-1" /> Add Soul
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-ministry-text text-white p-5 rounded-xl shadow-sm">
                                        <p className="text-xs uppercase font-bold text-gray-400 mb-1">Total Souls Won</p>
                                        <p className="text-3xl font-black">{souls.filter(s => s.sourceId === selectedEventId).length}</p>
                                    </div>
                                </div>

                                {/* Local Souls Table */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex justify-between items-center">
                                        <span>Souls Captured in this Service</span>
                                        <span className="text-xs font-normal text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{souls.filter(s => s.sourceId === selectedEventId).length} Records</span>
                                    </div>
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white text-gray-500 font-bold border-b border-gray-100 uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-3">Name</th>
                                                <th className="px-6 py-3">Phone</th>
                                                <th className="px-6 py-3">Residence</th>
                                                <th className="px-6 py-3">Gender</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {souls
                                                .filter(s => s.sourceId === selectedEventId)
                                                .filter(s =>
                                                    s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    (s.phone && s.phone.includes(searchQuery))
                                                )
                                                .map(soul => (
                                                    <tr key={soul.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-3 font-bold text-gray-900">{soul.firstName} {soul.lastName}</td>
                                                        <td className="px-6 py-3 text-gray-600 font-mono">{soul.phone}</td>
                                                        <td className="px-6 py-3 text-gray-600">{soul.residence}</td>
                                                        <td className="px-6 py-3 text-gray-600">{soul.gender}</td>
                                                        <td className="px-6 py-3">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${soul.status === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                                {soul.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-right flex justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingSoul(soul);
                                                                    setShowAddSoulForm(true);
                                                                }}
                                                                disabled={activeTab === 'services' && selectedEventId && isServiceClosed(services.find(s => s.id === selectedEventId)?.date || '')}
                                                                className={`transition-colors p-1 ${activeTab === 'services' && selectedEventId && isServiceClosed(services.find(s => s.id === selectedEventId)?.date || '') ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600'}`}
                                                                title="Edit Soul"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const confirmed = await showConfirm(
                                                                        <span>Are you sure you want to delete <strong>{soul.firstName} {soul.lastName}</strong>? This cannot be undone.</span>,
                                                                        { title: 'Delete Soul', confirmText: 'Delete', isDestructive: true }
                                                                    );
                                                                    if (confirmed) {
                                                                        try {
                                                                            await SoulsStore.delete(soul.id || '');
                                                                            showToast('Soul deleted successfully', 'success');
                                                                            loadData();
                                                                        } catch (e) {
                                                                            showToast('Failed to delete soul', 'error');
                                                                        }
                                                                    }
                                                                }}
                                                                disabled={activeTab === 'services' && selectedEventId && isServiceClosed(services.find(s => s.id === selectedEventId)?.date || '')}
                                                                className={`transition-colors p-1 ${activeTab === 'services' && selectedEventId && isServiceClosed(services.find(s => s.id === selectedEventId)?.date || '') ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}
                                                                title="Delete Soul"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                        {souls.filter(s => s.sourceId === selectedEventId).length === 0 && (
                                            <tbody>
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                                                        No souls recorded for this service yet. click "Add Souls Won" to begin.
                                                    </td>
                                                </tr>
                                            </tbody>
                                        )}
                                    </table>
                                </div>
                            </div>
                        ) : selectedEventId && activeTab === 'events' ? (
                            <EventDetailView />
                        ) : (
                            <>
                                {activeTab === 'services' && <ServicesList />}
                                {activeTab === 'events' && <EventsList />}
                                {activeTab === 'database' && canViewDatabase && <SoulsDatabase />}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Modal for Adding Soul manually */}
            {
                showAddSoulForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
                            <SoulEntryForm
                                sourceType={activeTab === 'events' ? 'Event' : 'Service'}
                                sourceId={selectedEventId || ''}
                                sourceName={
                                    (activeTab === 'events' ? events : services).find(e => e.id === selectedEventId)?.title
                                }
                                eventId={selectedEventId || undefined}
                                capturedBy={currentUser.id}
                                initialData={editingSoul || undefined}
                                // existingMember={preFilledMember || undefined} // Removed legacy prop
                                onSubmit={handleAddSoul}
                                onCancel={() => {
                                    setShowAddSoulForm(false);
                                    setEditingSoul(null);
                                }}
                            />
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default FollowUpDashboard;
