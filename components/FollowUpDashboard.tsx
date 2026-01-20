import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Users, Calendar, Database, Plus, Search, Link as LinkIcon, Share2, Copy, Check, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MinistryEvent, Soul, Member } from '../types';
import { isEventLocked, isServiceClosed } from '../utils';
import { EventStore } from '../database/eventStore';
import { SoulsStore } from '../database/soulsStore';
import { MemberStore } from '../database/memberStore';
import SoulEntryForm from './SoulEntryForm';
import MemberSearchInput from './MemberSearchInput';

type Tab = 'services' | 'events' | 'database';

const FollowUpDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('services');
    const [events, setEvents] = useState<MinistryEvent[]>([]);
    const [services, setServices] = useState<MinistryEvent[]>([]);
    const [souls, setSouls] = useState<Soul[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Selection State
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [showAddSoulForm, setShowAddSoulForm] = useState(false);

    // Link Copy State
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

    // Member Search State
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
    const [isSearchingMembers, setIsSearchingMembers] = useState(false);
    const [preFilledMember, setPreFilledMember] = useState<Member | null>(null);

    // Debounce Search
    useEffect(() => {
        if (memberSearchTerm.length < 3) {
            setMemberSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearchingMembers(true);
            try {
                let results: Member[] = [];
                // If we are in a specific service view, search ALL members but check their status for this service
                if (selectedEventId && activeTab === 'services') {
                    results = await MemberStore.searchMembersWithStatus(selectedEventId, memberSearchTerm);
                } else {
                    // Fallback or generic search if needed (though UI currently only shows this in ServiceDetail)
                    // Keeping generic search for safety or other views
                    const { data } = await MemberStore.getMembers(1, 10, memberSearchTerm);
                    results = data;
                }
                setMemberSearchResults(results);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearchingMembers(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [memberSearchTerm]);

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
            const allEvents = await EventStore.getAll();
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
        try {
            await SoulsStore.add(soulData as Soul); // Type assertion, id/created handled by DB/Store mapping
            // Refresh
            await loadData();
            setShowAddSoulForm(false);
            // Optional: Show toast
        } catch (e) {
            console.error("Failed to save soul", e);
            alert("Failed to save. Please try again.");
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
                                {service.stats?.soulsWon || 0} Souls
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



    const EventDetailView = () => {
        const event = events.find(e => e.id === selectedEventId);
        if (!event) return <div>Event not found</div>;

        const isLocked = isEventLocked(event.date);

        const eventSouls = souls.filter(s => s.sourceId === selectedEventId);
        const soulsWon = eventSouls.filter(s => s.status !== 'Confirmed');
        const confirmations = eventSouls.filter(s => s.status === 'Confirmed');

        const [viewTab, setViewTab] = useState<'souls' | 'confirmations'>('souls');

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-ministry-text text-white p-5 rounded-xl shadow-sm">
                        <p className="text-xs uppercase font-bold text-gray-400 mb-1">Total Souls Won</p>
                        <p className="text-3xl font-black">{soulsWon.length}</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                        <p className="text-xs uppercase font-bold text-gray-500 mb-1">Confirmations</p>
                        <p className="text-3xl font-black text-blue-600">{confirmations.length}</p>
                    </div>
                </div>

                {/* Tabs */}
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
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-gray-500 font-bold border-b border-gray-100 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Phone</th>
                                <th className="px-6 py-3">Residence</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(viewTab === 'souls' ? soulsWon : confirmations).map(soul => (
                                <tr key={soul.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 font-bold text-gray-900">{soul.firstName} {soul.lastName}</td>
                                    <td className="px-6 py-3 text-gray-600 font-mono">{soul.phone}</td>
                                    <td className="px-6 py-3 text-gray-600">{soul.residence}</td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${soul.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {soul.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {(viewTab === 'souls' ? soulsWon : confirmations).length === 0 && (
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
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        {soul.sourceType}
                                    </span>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {((soul.sourceType === 'Event' ? events : services).find(e => e.id === soul.sourceId)?.title) || 'Unknown Source'}
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
                    onClick={() => setActiveTab('services')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'services' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Calendar className={`w-4 h-4 ${activeTab === 'services' ? 'text-ministry-neon' : ''}`} />
                    <span>Services</span>
                </button>
                <button
                    onClick={() => setActiveTab('events')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'events' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Users className={`w-4 h-4 ${activeTab === 'events' ? 'text-ministry-neon' : ''}`} />
                    <span>Events</span>
                </button>
                <button
                    onClick={() => setActiveTab('database')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'database' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Database className={`w-4 h-4 ${activeTab === 'database' ? 'text-ministry-neon' : ''}`} />
                    <span>Souls Database</span>
                </button>
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

                                <MemberSearchInput
                                    onSearch={(term) => setMemberSearchTerm(term)}
                                    isSearching={isSearchingMembers}
                                    searchResults={memberSearchResults}
                                    onSelectMember={(member) => {
                                        setPreFilledMember(member);
                                        setShowAddSoulForm(true);
                                    }}
                                    onAddNew={() => {
                                        setPreFilledMember(null);
                                        setShowAddSoulForm(true);
                                    }}
                                    disabled={selectedEventId ? isServiceClosed(services.find(s => s.id === selectedEventId)?.date || '') : false}
                                />

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
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {souls.filter(s => s.sourceId === selectedEventId).map(soul => (
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
                                                </tr>
                                            ))}
                                            {souls.filter(s => s.sourceId === selectedEventId).length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                                                        No souls recorded for this service yet. click "Add Souls Won" to begin.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : selectedEventId && activeTab === 'events' ? (
                            <EventDetailView />
                        ) : (
                            <>
                                {activeTab === 'services' && <ServicesList />}
                                {activeTab === 'events' && <EventsList />}
                                {activeTab === 'database' && <SoulsDatabase />}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Modal for Adding Soul manually */}
            {showAddSoulForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <SoulEntryForm
                            sourceType={activeTab === 'events' ? 'Event' : 'Service'}
                            sourceId={selectedEventId || ''}
                            sourceName={
                                (activeTab === 'events' ? events : services).find(e => e.id === selectedEventId)?.title
                            }
                            existingMember={preFilledMember || undefined}
                            onSubmit={handleAddSoul}
                            onCancel={() => setShowAddSoulForm(false)}
                        />
                    </div>
                </div>
            )}

        </div>
    );
};

export default FollowUpDashboard;
