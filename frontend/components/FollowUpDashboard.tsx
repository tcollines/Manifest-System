import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSafeAsync } from '../hooks/useSafeAsync';
import { useNotification } from './ui/NotificationSystem';
import { supabase } from '../services/supabaseClient';
import * as XLSX from 'xlsx';
import { Users, Calendar, Database, Plus, Search, Link as LinkIcon, Share2, Copy, Check, Filter, ChevronLeft, ChevronRight, X, Trash2, Pencil, Clock, User as UserIcon } from 'lucide-react';
import { MinistryEvent, Soul, Member, ModalType, User } from '../types';
import { isEventLocked, isServiceClosed } from '../utils';
import { EventStore, mapEventFromDB } from '../database/eventStore';
import { SoulsStore, mapSoulFromDB } from '../database/soulsStore';
import { MemberStore } from '../database/memberStore';
import { SOURCE_TYPE_COLORS } from '../constants';
import SoulEntryForm from './SoulEntryForm';
import MemberSearchInput from './MemberSearchInput';
import { analyticsService } from '../services/analyticsService';

type Tab = 'services' | 'events' | 'database' | 'first-timers' | 'members' | 'analysis';


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
    const canViewDatabase = true; // User requested all members in FollowUp see all tabs

    // Selection State
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedEventId = searchParams.get('eventId') || null;
    const setSelectedEventId = (id: string | null) => {
        setSearchParams(prev => {
            if (id) prev.set('eventId', id);
            else prev.delete('eventId');
            return prev;
        }, { replace: true });
    };
    const [showAddSoulForm, setShowAddSoulForm] = useState(false);

    // Link Copy State
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

    // Search & Edit State
    const [searchQuery, setSearchQuery] = useState('');
    const [dbEventFilter, setDbEventFilter] = useState<string>(''); // For Database tab filtering
    const [editingSoul, setEditingSoul] = useState<Soul | null>(null);

    // Soul Details View
    const [viewMode, setViewMode] = useState<'list' | 'soul-detail'>('list');
    const [selectedSoulDetails, setSelectedSoulDetails] = useState<any | null>(null);

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

    // Member DB Tab State
    const [membersDb, setMembersDb] = useState<Member[]>([]);
    const [totalMembersDb, setTotalMembersDb] = useState(0);
    const [membersDbQuery, setMembersDbQuery] = useState('');
    const [debouncedMembersDbQuery, setDebouncedMembersDbQuery] = useState('');
    const [membersDbPage, setMembersDbPage] = useState(1);
    const [isSearchingMembersDb, setIsSearchingMembersDb] = useState(false);
    const itemsPerPage = 50;

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedMembersDbQuery(membersDbQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [membersDbQuery]);

    // Analysis Tab State
    const [analysisData, setAnalysisData] = useState<any[]>([]);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [analysisPage, setAnalysisPage] = useState(1);
    const analysisItemsPerPage = 50;

    const totalAnalysisPages = Math.ceil(analysisData.length / analysisItemsPerPage);
    const paginatedAnalysisData = analysisData.slice((analysisPage - 1) * analysisItemsPerPage, analysisPage * analysisItemsPerPage);

    useEffect(() => {
        if (activeTab === 'analysis') {
            const loadAnalysis = async () => {
                setIsLoadingAnalysis(true);
                try {
                    const data = await analyticsService.fetchFollowUpAnalysis();
                    setAnalysisData(data);
                } catch (error) {
                    showToast('Failed to load analysis', 'error');
                } finally {
                    setIsLoadingAnalysis(false);
                }
            };
            loadAnalysis();
        }
    }, [activeTab]);

    // Member Profile Editing State
    const [selectedMemberDetails, setSelectedMemberDetails] = useState<any | null>(null);
    const [isEditingMember, setIsEditingMember] = useState(false);
    const [memberFormData, setMemberFormData] = useState({ name: '', phone: '', category: 'Member', residence: '', occupation: '', placeOfWork: '', followUpStatus: 'Pending', followUpNotes: '' });

    const [viewModeAnalysis, setViewModeAnalysis] = useState<'list' | 'detail'>('list');
    const [selectedAnalysisMember, setSelectedAnalysisMember] = useState<any | null>(null);

    const handleViewAnalysisDetail = async (id: string, basicRecord: any) => {
        setIsLoadingAnalysis(true);
        try {
            const details = await MemberStore.getMemberDetails(id);
            setSelectedAnalysisMember(details);
            
            setMemberFormData({
                ...memberFormData,
                followUpStatus: basicRecord?.followUpStatus || 'Pending',
                followUpNotes: basicRecord?.followUpNotes || ''
            });
            
            setViewModeAnalysis('detail');
        } catch (e) {
            showToast('Failed to load member details', 'error');
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

    const handleSaveFollowUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAnalysisMember) return;
        try {
            await MemberStore.update({
                id: selectedAnalysisMember.member.id,
                followUpStatus: memberFormData.followUpStatus,
                followUpNotes: memberFormData.followUpNotes,
            } as any);
            
            showToast('Follow-up tracked securely', 'success');
            
            setAnalysisData(prev => prev.map(d => d.id === selectedAnalysisMember.member.id ? {
                ...d, 
                followUpStatus: memberFormData.followUpStatus,
                followUpNotes: memberFormData.followUpNotes
            } : d));
            
            setViewModeAnalysis('list');
        } catch (error) {
            showToast('Failed to save follow-up', 'error');
        }
    };

    const handleViewMemberDb = async (id: string) => {
        setIsLoading(true);
        try {
            const details = await MemberStore.getMemberDetails(id);
            setSelectedMemberDetails(details);
            setViewMode('member-detail' as any); // Re-using state
            setMemberFormData({
                name: details.member.name || '',
                phone: details.member.phone || '',
                category: details.member.category || 'Member',
                residence: details.member.residency || '',
                occupation: details.member.occupation || '',
                placeOfWork: details.member.placeOfWork || ''
            });
        } catch (error) {
            showToast('Failed to load member details', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateMemberDb = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await MemberStore.update({ ...selectedMemberDetails.member, ...memberFormData });
            showToast('Member profile updated successfully', 'success');
            setIsEditingMember(false);
            
            // Refresh detailed view
            handleViewMemberDb(selectedMemberDetails.member.id);
        } catch (error) {
            showToast('Failed to update member profile', 'error');
        }
    };

    useEffect(() => {
        if (activeTab === 'members') {
            const fetchMembers = async () => {
                setIsSearchingMembersDb(true);
                try {
                    const res = await MemberStore.getMembers(membersDbPage, itemsPerPage, debouncedMembersDbQuery);
                    if (res.status === 'success' && Array.isArray(res.data)) {
                        setMembersDb(res.data);
                        setTotalMembersDb(res.count || res.data.length);
                    }
                } catch (e) {
                    console.error("Failed to load members", e);
                } finally {
                    setIsSearchingMembersDb(false);
                }
            };
            fetchMembers();
        }
    }, [activeTab, membersDbPage, debouncedMembersDbQuery]);


    useEffect(() => {
        loadData();

        // Global listener for ministry_events to keep list fresh
        // No loadData()! Just update the lists.
        const channel = supabase.channel('followup-events-global')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ministry_events' }, (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;
                if (eventType === 'INSERT') {
                    const mapped = mapEventFromDB(newRecord);
                    if (mapped.type === 'Service') setServices(prev => [mapped, ...prev]);
                    else setEvents(prev => [mapped, ...prev]);
                } else if (eventType === 'UPDATE') {
                    const mapped = mapEventFromDB(newRecord);
                    setServices(prev => prev.map(s => s.id === mapped.id ? mapped : s));
                    setEvents(prev => prev.map(e => e.id === mapped.id ? mapped : e));
                } else if (eventType === 'DELETE') {
                    setServices(prev => prev.filter(s => s.id !== oldRecord.id));
                    setEvents(prev => prev.filter(e => e.id !== oldRecord.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Scoped Realtime for Souls
    useEffect(() => {
        // If we want real-time updates for "All Souls" (database tab), we use a global channel
        // but if we are in a specific event, we scope it.
        const channelName = selectedEventId ? `followup-souls-scoped-${selectedEventId}` : 'followup-souls-global';
        const filter = selectedEventId ? `source_id=eq.${selectedEventId}` : undefined;

        const channel = supabase.channel(channelName)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'souls',
                filter: filter
            }, (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;
                if (eventType === 'INSERT') {
                    const mapped = mapSoulFromDB(newRecord);
                    setSouls(prev => {
                        if (prev.some(s => s.id === mapped.id)) return prev;
                        return [mapped, ...prev];
                    });
                } else if (eventType === 'UPDATE') {
                    const mapped = mapSoulFromDB(newRecord);
                    setSouls(prev => prev.map(s => s.id === mapped.id ? mapped : s));
                } else if (eventType === 'DELETE') {
                    setSouls(prev => prev.filter(s => s.id !== oldRecord.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedEventId]);

    const handleViewSoul = async (soulId: string) => {
        setIsLoading(true);
        try {
            const details = await SoulsStore.getSoulDetails(soulId);
            setSelectedSoulDetails(details);
            setViewMode('soul-detail');
        } catch (error) {
            showToast('Failed to load soul details', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const eventsResp = await EventStore.getAll();
            const allEvents = eventsResp.status === 'success' ? eventsResp.data : [];

            setEvents(allEvents.filter(e => e.type === 'Event'));
            setServices(allEvents.filter(e => e.type === 'Service'));

            const allSouls = await SoulsStore.getAll(dbEventFilter);
            setSouls(allSouls);
        } catch (e) {
            console.error("Failed to load dashboard data", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'database') {
            loadData();
        }
    }, [dbEventFilter, activeTab]);

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
            // Refresh - No, we rely on Realtime now. 
            // But for safety and UX, we can keep it if not in Realtime mode, 
            // BUT our rule is "Granular over Master Refresh".
            // So we remove loadData() here.
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

        const [viewTab, setViewTab] = useState<'souls' | 'confirmations' | 'attendees' | 'firstTimers'>('souls');
        const [attendees, setAttendees] = useState<any[]>([]);
        const [loadingAttendees, setLoadingAttendees] = useState(false);

        const firstTimers = attendees.filter(a => a.isFirstTime);

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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-ministry-text text-white p-5 rounded-xl shadow-sm">
                        <p className="text-xs uppercase font-bold text-gray-400 mb-1">Total Souls Won</p>
                        <p className="text-3xl font-black">{soulsWon.length}</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                        <p className="text-xs uppercase font-bold text-gray-500 mb-1">Confirmations</p>
                        <p className="text-3xl font-black text-blue-600">{confirmations.length}</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                        <p className="text-xs uppercase font-bold text-gray-500 mb-1">First Timers</p>
                        <p className="text-3xl font-black text-purple-600">{firstTimers.length > 0 ? firstTimers.length : '-'}</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                        <p className="text-xs uppercase font-bold text-gray-500 mb-1">Total Attendees</p>
                        <p className="text-3xl font-black text-green-600">{attendees.length > 0 ? attendees.length : '-'}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-between items-center">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
                        <button
                            onClick={() => setViewTab('souls')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${viewTab === 'souls' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Souls Won
                        </button>
                        <button
                            onClick={() => setViewTab('confirmations')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${viewTab === 'confirmations' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Confirmations
                        </button>
                        <button
                            onClick={() => setViewTab('firstTimers')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${viewTab === 'firstTimers' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            First Timers
                        </button>
                        <button
                            onClick={() => setViewTab('attendees')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${viewTab === 'attendees' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            All Attendees
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
                            {viewTab === 'attendees' || viewTab === 'firstTimers' ? (
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
                            {viewTab === 'attendees' || viewTab === 'firstTimers' ? (
                                loadingAttendees ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading attendees...</td></tr>
                                ) :
                                    (viewTab === 'firstTimers' ? firstTimers : attendees).map((member: any) => (
                                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 font-bold text-gray-900">{member.name}</td>
                                            <td className="px-6 py-3 text-gray-600 font-mono">{member.phone}</td>
                                            <td className="px-6 py-3 text-gray-600">{member.residency}</td>
                                            <td className="px-6 py-3 text-gray-600">{member.gender}</td>
                                            <td className="px-6 py-3 text-gray-500">
                                                <div className="flex flex-wrap gap-1">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${member.category === 'Student' ? 'bg-indigo-100 text-indigo-700' :
                                                        member.category === 'Institution' ? 'bg-cyan-100 text-cyan-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {member.category}
                                                    </span>
                                                    {member.isFirstTime && (
                                                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">
                                                            First Timer
                                                        </span>
                                                    )}
                                                    {member.soulWon && (
                                                        <span className="bg-ministry-text text-white px-2 py-0.5 rounded text-xs font-bold">
                                                            Soul Won
                                                        </span>
                                                    )}
                                                </div>
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
                                                            // loadData(); // Removed in favor of Realtime
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
                            {(viewTab === 'attendees' || viewTab === 'firstTimers') && !loadingAttendees && (viewTab === 'firstTimers' ? firstTimers : attendees).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                                        No {viewTab === 'firstTimers' ? 'first timers' : 'attendees'} recorded yet.
                                    </td>
                                </tr>
                            )}
                            {(viewTab === 'souls' || viewTab === 'confirmations') && (viewTab === 'souls' ? soulsWon : confirmations).length === 0 && (
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
                <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <select
                        value={dbEventFilter}
                        onChange={(e) => setDbEventFilter(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ministry-orange bg-white min-w-[200px]"
                    >
                        <option value="">All Events & Services</option>
                        <optgroup label="Services">
                            {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </optgroup>
                        <optgroup label="Events">
                            {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                        </optgroup>
                    </select>
                </div>
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
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SOURCE_TYPE_COLORS[soul.sourceType as keyof typeof SOURCE_TYPE_COLORS] || 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {soul.sourceType}
                                    </span>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {soul.sourceType === 'Healing Dept'
                                            ? (soul.notes?.replace('Healing Outreach: ', '') || 'Hospital Outreach')
                                            : soul.sourceType === 'Campus'
                                                ? (soul.campusCategory || 'Campus Outreach')
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
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button
                                        onClick={() => handleViewSoul(soul.id || '')}
                                        className="text-gray-400 hover:text-green-600 transition-colors p-1"
                                        title="View Details & Attendance"
                                    >
                                        <Search className="w-4 h-4" />
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
                                                    // loadData(); // Removed in favor of Realtime granular update
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

    const SoulDetailView = () => {
        if (!selectedSoulDetails) return null;
        const { member, attendedCount, totalServices, history } = selectedSoulDetails;

        const score = totalServices > 0 ? Math.round((attendedCount / totalServices) * 100) : 0;

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setViewMode('list')}
                        className="flex items-center text-gray-500 hover:text-ministry-text font-bold transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm"
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" />
                        Back to Souls Database
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Stats & Profile */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Score Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 text-blue-600 mb-4">
                                <Database className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-1">{member.name}</h3>
                            <p className="text-sm font-bold text-gray-500 mb-6">{member.category}</p>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                                <div>
                                    <p className="text-xs uppercase font-bold text-gray-400">Total Attended</p>
                                    <p className="text-2xl font-black">{attendedCount}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase font-bold text-gray-400">Expected Services</p>
                                    <p className="text-2xl font-black">{totalServices}</p>
                                </div>
                                <div className="col-span-2 mt-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-xs uppercase font-bold text-gray-400">Attendance Score</p>
                                    <p className="text-3xl font-black text-blue-600">{score}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Profile Details */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h4 className="text-xs uppercase font-bold text-gray-400 mb-4 flex items-center"><UserIcon className="w-4 h-4 mr-2" />Profile Details</h4>
                            <div className="space-y-4">
                                <div><p className="text-xs text-gray-400">Phone</p><p className="font-bold text-gray-900 font-mono">{member.phone}</p></div>
                                <div><p className="text-xs text-gray-400">Gender</p><p className="font-bold text-gray-900">{member.gender}</p></div>
                                <div><p className="text-xs text-gray-400">Residence</p><p className="font-bold text-gray-900">{member.residency}</p></div>
                                <div><p className="text-xs text-gray-400">Occupation</p><p className="font-bold text-gray-900">{member.occupation || 'N/A'}</p></div>
                                <div><p className="text-xs text-gray-400">Status</p><p className="font-bold text-gray-900 flex flex-wrap gap-2">{member.status}</p></div>
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                <Calendar className="w-5 h-5 mr-2 text-gray-400" />
                                Recent Activity
                            </h3>
                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">
                                {history.length} records
                            </span>
                        </div>

                        {history.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                No service attendance history found. Check-ins to ministry events will appear here.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {history.map((record: any, idx: number) => (
                                    <div key={idx} className="flex items-start p-4 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                                        <div className="bg-blue-100 p-2 rounded-lg mr-4">
                                            <Calendar className="w-5 h-5 text-blue-600" />
                                        </div>
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
    };

    const FirstTimersView = () => {
        const [subTab, setSubTab] = useState<'services' | 'events'>('services');
        const [firstTimers, setFirstTimers] = useState<{ services: any[], events: any[] }>({ services: [], events: [] });
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
                setLoadingFT(false);
            });
        }, []);

        const handleDownloadFT = () => {
            const currentData = subTab === 'services' ? firstTimers.services : firstTimers.events;
            
            const exportData = currentData.map(ft => {
                return {
                    "Name": ft.name,
                    "Phone": ft.phone,
                    "Gender": ft.gender,
                    "Residence": ft.residency,
                    "Source Event Date": ft.check_in_time ? new Date(ft.check_in_time).toLocaleDateString() : 'Unknown',
                    "Source Event Title": ft.source_event_title || 'Unknown Source'
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, `First Timers`);
            XLSX.writeFile(workbook, `FirstTimers_${subTab}.xlsx`);
        };

        const handleViewFirstTimer = async (id: string) => {
            setLoadingFT(true);
            try {
                let details;
                if (subTab === 'services') {
                    details = await MemberStore.getMemberDetails(id);
                } else {
                    details = await (MemberStore as any).getPassengerDetails(id);
                }
                setSelectedFTDetails(details);
                setViewModeFT('detail');
            } catch (error) {
                showToast('Failed to load first timer details', 'error');
            } finally {
                setLoadingFT(false);
            }
        };

        const currentData = subTab === 'services' ? firstTimers.services : firstTimers.events;

        if (viewModeFT === 'detail' && selectedFTDetails) {
            const { member, attendedCount, totalServices, history } = selectedFTDetails;
            const score = totalServices > 0 ? Math.round((attendedCount / totalServices) * 100) : 0;

            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setViewModeFT('list')}
                            className="flex items-center text-gray-500 hover:text-ministry-text font-bold transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5 mr-1" />
                            Back to Database
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Stats & Profile */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Score Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 text-blue-600 mb-4">
                                    <UserIcon className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-1">{member.name}</h3>
                                <p className="text-sm font-bold text-gray-500 mb-6">{member.category || 'First Timer'}</p>

                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                                    <div>
                                        <p className="text-xs uppercase font-bold text-gray-400">Total Attended</p>
                                        <p className="text-2xl font-black">{attendedCount}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-bold text-gray-400">Expected Services</p>
                                        <p className="text-2xl font-black">{totalServices}</p>
                                    </div>
                                    <div className="col-span-2 mt-2 bg-gray-50 p-4 rounded-xl border border-gray-100 items-center justify-center text-center">
                                        <p className="text-xs uppercase font-bold text-gray-400">Attendance Score</p>
                                        <p className="text-3xl font-black text-blue-600">{score}%</p>
                                    </div>
                                </div>
                            </div>

                            {/* Profile Details */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h4 className="text-xs uppercase font-bold text-gray-400 mb-4 flex items-center"><UserIcon className="w-4 h-4 mr-2" />Profile Details</h4>
                                <div className="space-y-4">
                                    <div><p className="text-xs text-gray-400">Phone</p><p className="font-bold text-gray-900 font-mono">{member.phone}</p></div>
                                    <div><p className="text-xs text-gray-400">Gender</p><p className="font-bold text-gray-900">{member.gender}</p></div>
                                    <div><p className="text-xs text-gray-400">Residence</p><p className="font-bold text-gray-900">{member.residency}</p></div>
                                    <div><p className="text-xs text-gray-400">Status</p><p className="font-bold text-gray-900 flex flex-wrap gap-2">{member.status}</p></div>
                                    <div><p className="text-xs text-gray-400">Joined Date</p><p className="font-bold text-gray-900">{member.joinedDate ? new Date(member.joinedDate).toLocaleDateString() : 'N/A'}</p></div>
                                </div>
                            </div>
                        </div>

                        {/* History */}
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                    <Calendar className="w-5 h-5 mr-2 text-gray-400" />
                                    Recent Activity
                                </h3>
                                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">
                                    {history.length} records
                                </span>
                            </div>

                            {history.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    No service attendance history found.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((record: any, idx: number) => (
                                        <div key={idx} className="flex items-start p-4 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                                            <div className="bg-blue-100 p-2 rounded-lg mr-4">
                                                <Calendar className="w-5 h-5 text-blue-600" />
                                            </div>
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

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-gray-500" />
                        First Timer Database
                        <span className="ml-3 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">{currentData.length}</span>
                    </h2>
                    
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setSubTab('services')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${subTab === 'services' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Services
                        </button>
                        <button
                            onClick={() => setSubTab('events')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${subTab === 'events' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Events
                        </button>
                    </div>

                    <button
                        onClick={handleDownloadFT}
                        disabled={loadingFT || currentData.length === 0}
                        className="text-sm font-bold text-green-700 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors flex items-center border border-green-200 disabled:opacity-50"
                    >
                        Download Excel
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Contact</th>
                                <th className="px-6 py-3">Residence</th>
                                <th className="px-6 py-3">Source Event</th>
                                <th className="px-6 py-3">Date Recorded</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loadingFT ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading database...</td>
                                </tr>
                            ) : currentData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No first timers found for {subTab}.</td>
                                </tr>
                            ) : (
                                currentData.map(ft => (
                                    <tr key={ft.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{ft.name}</td>
                                        <td className="px-6 py-4 text-gray-600 font-mono">{ft.phone}</td>
                                        <td className="px-6 py-4 text-gray-600">{ft.residency}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {ft.source_event_title}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {ft.check_in_time ? new Date(ft.check_in_time).toLocaleDateString() : 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => handleViewFirstTimer(ft.id)}
                                                className="text-gray-400 hover:text-green-600 transition-colors p-1"
                                                title="View Details & Attendance"
                                            >
                                                <Search className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

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
                {canViewDatabase && (
                    <button
                        onClick={() => {
                            setActiveTab('first-timers');
                            setSelectedEventId(null);
                        }}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'first-timers' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Users className={`w-4 h-4 ${activeTab === 'first-timers' ? 'text-ministry-neon' : ''}`} />
                        <span>First Timer Database</span>
                    </button>
                )}
                {canViewDatabase && (
                    <button
                        onClick={() => {
                            setActiveTab('members');
                            setSelectedEventId(null);
                        }}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'members' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Database className={`w-4 h-4 ${activeTab === 'members' ? 'text-ministry-neon' : ''}`} />
                        <span>Member Database</span>
                    </button>
                )}
                {canViewDatabase && (
                    <button
                        onClick={() => {
                            setActiveTab('analysis');
                            setSelectedEventId(null);
                        }}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'analysis' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Search className={`w-4 h-4 ${activeTab === 'analysis' ? 'text-ministry-neon' : ''}`} />
                        <span>Needs Follow Up</span>
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
                                                                            // loadData(); // Removed in favor of Realtime
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
                                {activeTab === 'database' && canViewDatabase && (viewMode === 'list' ? <SoulsDatabase /> : <SoulDetailView />)}
                                {activeTab === 'first-timers' && canViewDatabase && <FirstTimersView />}
                                
                                {/* MEMBERS DB TAB */}
                                {activeTab === 'members' && canViewDatabase && (
                                    viewMode === 'list' || viewMode === 'soul-detail' ? (
                                        <div className="space-y-6 p-4 md:p-0">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                                    <Database className="w-5 h-5 mr-2 text-gray-500" />
                                                    Member Database Dashboard
                                                </h3>
                                            </div>

                                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                            {/* Search */}
                                            <div className="relative flex-1 w-full">
                                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isSearchingMembersDb ? 'text-ministry-orange animate-pulse' : 'text-gray-400'}`} />
                                                <input
                                                    type="text"
                                                    placeholder="Search native member database by name, phone, or tags..."
                                                    value={membersDbQuery}
                                                    onChange={(e) => {
                                                        setMembersDbQuery(e.target.value);
                                                        setMembersDbPage(1); // Reset to page 1 on search
                                                    }}
                                                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ministry-orange transition-all"
                                                />
                                            </div>
                                        </div>

                                        {/* PAGINATION CONTROLS */}
                                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm sticky top-0 z-10">
                                            <div>
                                                <span className="text-sm font-medium text-gray-500">Showing </span>
                                                <span className="font-bold text-ministry-text mx-1">
                                                    {totalMembersDb === 0 ? 0 : (membersDbPage - 1) * itemsPerPage + 1} - {Math.min(membersDbPage * itemsPerPage, totalMembersDb)}
                                                </span>
                                                <span className="text-sm font-medium text-gray-500"> of {totalMembersDb} members</span>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    disabled={membersDbPage === 1}
                                                    onClick={() => setMembersDbPage(p => Math.max(1, p - 1))}
                                                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white hover:border-ministry-orange hover:text-ministry-orange disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-gray-700 transition-all font-mono shadow-sm"
                                                >
                                                    <ChevronLeft className="w-4 h-4 inline" /> Prev
                                                </button>
                                                <button
                                                    disabled={membersDbPage * itemsPerPage >= totalMembersDb}
                                                    onClick={() => setMembersDbPage(p => p + 1)}
                                                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white hover:border-ministry-orange hover:text-ministry-orange disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-gray-700 transition-all font-mono shadow-sm"
                                                >
                                                    Next <ChevronRight className="w-4 h-4 inline" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* DATABASE TABLE */}
                                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[70vh]">
                                            <div className="overflow-x-auto overflow-y-auto flex-1">
                                                <table className="w-full text-left relative min-w-[700px]">
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
                                                        {membersDb.map((member) => (
                                                            <tr key={member.id} className="hover:bg-blue-50/30 transition-colors group">
                                                                <td className="px-6 py-4">
                                                                    <div className="font-bold text-gray-900 group-hover:text-ministry-blue transition-colors">{member.name}</div>
                                                                    <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">{member.role}</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">{member.category || 'Member'}</span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block">{member.phone}</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-sm text-gray-700 font-medium">{member.residency || 'N/A'}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <button 
                                                                        onClick={() => handleViewMemberDb(member.id)} 
                                                                        className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors inline-flex items-center justify-center shadow-sm"
                                                                    >
                                                                        View
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {membersDb.length === 0 && !isSearchingMembersDb && (
                                                            <tr><td colSpan={5} className="py-16 text-center text-gray-400 font-medium">No members found matching your search.</td></tr>
                                                        )}
                                                        {membersDb.length === 0 && isSearchingMembersDb && (
                                                            <tr><td colSpan={5} className="py-16 text-center font-bold text-ministry-orange animate-pulse">Running extensive database query...</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Bottom Pagination Info */}
                                            <div className="flex justify-center py-4 bg-gray-50 border-t border-gray-100">
                                                <div className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">
                                                    Page {membersDbPage} / {Math.max(1, Math.ceil(totalMembersDb / itemsPerPage))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    ) : viewMode === 'member-detail' && selectedMemberDetails ? (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                            <button onClick={() => setViewMode('list')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-800 transition-colors p-2 hover:bg-gray-50 rounded-lg">
                                                <ChevronLeft className="w-5 h-5" />
                                                <span className="font-bold">Back to Database</span>
                                            </button>
                                            </div>

                                            {/* Top Stats Cards */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                                                <div className="p-3 bg-blue-50 rounded-full"><Users className="w-8 h-8 text-blue-600" /></div>
                                                <div>
                                                <p className="text-xs uppercase font-bold text-gray-400">Total Attended</p>
                                                <p className="text-2xl font-black text-gray-900">{selectedMemberDetails.attendedCount} Services</p>
                                                </div>
                                            </div>
                                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                                                <div className="p-3 bg-purple-50 rounded-full"><Database className="w-8 h-8 text-purple-600" /></div>
                                                <div>
                                                <p className="text-xs uppercase font-bold text-gray-400">Expected Services</p>
                                                <p className="text-2xl font-black text-gray-900">{selectedMemberDetails.totalServices} Held</p>
                                                <p className="text-xs text-gray-500">Since Joined ({new Date(selectedMemberDetails.member.joinedDate || '').toLocaleDateString()})</p>
                                                </div>
                                            </div>
                                            <div className="bg-ministry-text text-white p-6 rounded-2xl shadow-lg flex items-center gap-4">
                                                <div className="p-3 bg-white/10 rounded-full"><Calendar className="w-8 h-8 text-white" /></div>
                                                <div>
                                                <p className="text-xs uppercase font-bold text-gray-400">Attendance Score</p>
                                                <p className="text-3xl font-black">
                                                    {selectedMemberDetails.totalServices > 0
                                                    ? Math.round((selectedMemberDetails.attendedCount / selectedMemberDetails.totalServices) * 100)
                                                    : 0}%
                                                </p>
                                                </div>
                                            </div>
                                            </div>

                                            <div className="flex flex-col lg:flex-row gap-6">
                                            {/* LEFT: Profile Details */}
                                            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><UserIcon className="w-5 h-5 text-gray-400" /> Member Profile</h3>
                                                <button
                                                    onClick={() => setIsEditingMember(!isEditingMember)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ${isEditingMember ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
                                                >
                                                    {isEditingMember ? 'Cancel Editing' : 'Edit Details'}
                                                </button>
                                                </div>

                                                <form onSubmit={handleUpdateMemberDb} className="space-y-5">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                                                    <input disabled={!isEditingMember} value={memberFormData.name} onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })} className={`w-full p-2.5 bg-gray-50 border rounded-xl text-sm transition-colors ${!isEditingMember ? 'border-transparent text-gray-600 font-medium' : 'border-gray-200 focus:border-ministry-blue focus:ring-1 focus:ring-ministry-blue bg-white'}`} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                                                    <input disabled={!isEditingMember} value={memberFormData.phone} onChange={(e) => setMemberFormData({ ...memberFormData, phone: e.target.value })} className={`w-full p-2.5 bg-gray-50 border rounded-xl text-sm transition-colors ${!isEditingMember ? 'border-transparent text-gray-600 font-medium font-mono' : 'border-gray-200 focus:border-ministry-blue focus:ring-1 focus:ring-ministry-blue bg-white'}`} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                                                    <select disabled={!isEditingMember} value={memberFormData.category} onChange={(e) => setMemberFormData({ ...memberFormData, category: e.target.value })} className={`w-full p-2.5 bg-gray-50 border rounded-xl text-sm transition-colors ${!isEditingMember ? 'border-transparent text-gray-600 font-medium appearance-none' : 'border-gray-200 focus:border-ministry-blue focus:ring-1 focus:ring-ministry-blue bg-white'}`}>
                                                        <option>First Timer</option>
                                                        <option>Member</option>
                                                    </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Residence</label>
                                                    <input disabled={!isEditingMember} value={memberFormData.residence} onChange={(e) => setMemberFormData({ ...memberFormData, residence: e.target.value })} className={`w-full p-2.5 bg-gray-50 border rounded-xl text-sm transition-colors ${!isEditingMember ? 'border-transparent text-gray-600 font-medium' : 'border-gray-200 focus:border-ministry-blue focus:ring-1 focus:ring-ministry-blue bg-white'}`} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Occupation</label>
                                                    <input disabled={!isEditingMember} value={memberFormData.occupation} onChange={(e) => setMemberFormData({ ...memberFormData, occupation: e.target.value })} className={`w-full p-2.5 bg-gray-50 border rounded-xl text-sm transition-colors ${!isEditingMember ? 'border-transparent text-gray-600 font-medium' : 'border-gray-200 focus:border-ministry-blue focus:ring-1 focus:ring-ministry-blue bg-white'}`} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Place of Work</label>
                                                    <input disabled={!isEditingMember} value={memberFormData.placeOfWork} onChange={(e) => setMemberFormData({ ...memberFormData, placeOfWork: e.target.value })} className={`w-full p-2.5 bg-gray-50 border rounded-xl text-sm transition-colors ${!isEditingMember ? 'border-transparent text-gray-600 font-medium' : 'border-gray-200 focus:border-ministry-blue focus:ring-1 focus:ring-ministry-blue bg-white'}`} />
                                                    </div>
                                                </div>

                                                {isEditingMember && (
                                                    <div className="pt-4 flex justify-end">
                                                    <button type="submit" className="bg-ministry-text text-white px-6 py-2.5 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-sm">Save Changes</button>
                                                    </div>
                                                )}
                                                </form>
                                            </div>

                                            {/* RIGHT: Attendance History */}
                                            <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
                                                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-gray-400" /> Recent Activity</h3>
                                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                                {selectedMemberDetails.history.map((record: any, idx: number) => (
                                                    <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                                                    <div className={`p-2 rounded-full mr-3 ${record.type === 'Service' || !record.type ? 'bg-green-100' : 'bg-purple-100'}`}>
                                                        {record.type === 'Service' || !record.type ? (
                                                        <Check className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                        <Calendar className="w-4 h-4 text-purple-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                        {record.title}
                                                        {record.type && record.type !== 'Service' && (
                                                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">
                                                            {record.type}
                                                            </span>
                                                        )}
                                                        </p>
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
                                    ) : null
                                )}

                        {activeTab === 'analysis' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                            <Search className="w-6 h-6 text-ministry-blue" />
                                            Needs Follow Up
                                        </h2>
                                        <p className="text-sm font-medium text-gray-500 mt-1">
                                            Tracking members who missed the 3 most recent consecutive services.
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 font-bold text-sm shadow-sm flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Total: {analysisData.length}
                                    </div>
                                </div>
                                
                                {viewModeAnalysis === 'detail' && selectedAnalysisMember ? (
                                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                                        <div className="flex items-center space-x-4 border-b border-gray-100 pb-4">
                                            <button
                                                onClick={() => setViewModeAnalysis('list')}
                                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                <ChevronLeft className="w-6 h-6 text-gray-600" />
                                            </button>
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900">{selectedAnalysisMember.member.name}</h2>
                                                <p className="text-gray-500 text-sm flex items-center mt-1">
                                                    <UserIcon className="w-4 h-4 mr-1" /> {selectedAnalysisMember.member.phone}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Top Stats Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                                                <div className="p-3 bg-blue-50 rounded-full"><Users className="w-8 h-8 text-blue-600" /></div>
                                                <div>
                                                    <p className="text-xs uppercase font-bold text-gray-400">Total Attended</p>
                                                    <p className="text-2xl font-black text-gray-900">{selectedAnalysisMember.attendedCount} Services</p>
                                                </div>
                                            </div>
                                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                                                <div className="p-3 bg-purple-50 rounded-full"><Database className="w-8 h-8 text-purple-600" /></div>
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
                                            {/* Left: Analytics & Form */}
                                            <div className="space-y-6">
                                                <form onSubmit={handleSaveFollowUp} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
                                                    <div>
                                                        <label className="text-sm font-bold text-gray-700 block mb-2">Follow Up Status</label>
                                                        <select 
                                                            value={memberFormData.followUpStatus || 'Pending'} 
                                                            onChange={(e) => setMemberFormData({...memberFormData, followUpStatus: e.target.value})}
                                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-ministry-blue focus:ring-1 focus:ring-ministry-blue transition-colors outline-none"
                                                        >
                                                            <option value="Pending">Pending</option>
                                                            <option value="Contacted">Contacted</option>
                                                            <option value="Resolved">Resolved</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-bold text-gray-700 block mb-2">Follow Up Comments</label>
                                                        <textarea 
                                                            value={memberFormData.followUpNotes || ''} 
                                                            onChange={(e) => setMemberFormData({...memberFormData, followUpNotes: e.target.value})}
                                                            placeholder="Enter contact details, prayer requests, or follow up outcomes..."
                                                            rows={4}
                                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-ministry-blue focus:ring-1 focus:ring-ministry-blue transition-colors outline-none block resize-none"
                                                        />
                                                    </div>
                                                    <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold shadow-sm hover:bg-gray-800 transition-colors">
                                                        Save Follow Up
                                                    </button>
                                                </form>
                                            </div>
                                            
                                            {/* Right: History */}
                                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-gray-400" /> Attendance History</h3>
                                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                                    {selectedAnalysisMember.history.map((record: any, idx: number) => (
                                                        <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                            <div className="p-2 rounded-full mr-3 bg-green-100">
                                                                <Check className="w-4 h-4 text-green-600" />
                                                            </div>
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
                                ) : (
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
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400 font-medium">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="w-8 h-8 border-4 border-ministry-blue border-t-transparent rounded-full animate-spin mb-4"></div>
                                                            Analyzing Attendance Records...
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : analysisData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                                                <Check className="w-6 h-6 text-green-600" />
                                                            </div>
                                                            <p className="text-gray-900 font-bold text-lg mb-1">No missed attendances detected</p>
                                                            <p className="text-gray-500 font-medium text-sm">All known members have attended recently. Praise God!</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedAnalysisData.map((record: any) => (
                                                    <tr key={record.id} className="hover:bg-gray-50/80 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs uppercase shadow-sm">
                                                                    {record.name.substring(0, 2)}
                                                                </div>
                                                                <span className="font-bold text-gray-900 group-hover:text-ministry-blue transition-colors">{record.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600 font-mono text-sm">{record.phone}</td>
                                                        <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap border-l border-gray-50/50">
                                                            <span className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-xs text-gray-700 shadow-sm">
                                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                                {record.lastServiceAttended}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${record.followUpStatus === 'Contacted' ? 'bg-green-100 text-green-700 border border-green-200' : record.followUpStatus === 'Resolved' ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                                                                {record.followUpStatus || 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleViewAnalysisDetail(record.id, record)}
                                                                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm inline-flex items-center"
                                                            >
                                                                View
                                                            </button>
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
                                                <button
                                                    onClick={() => setAnalysisPage(p => Math.max(1, p - 1))}
                                                    disabled={analysisPage === 1}
                                                    className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors shadow-sm"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setAnalysisPage(p => Math.min(totalAnalysisPages, p + 1))}
                                                    disabled={analysisPage === totalAnalysisPages}
                                                    className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors shadow-sm"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                )}
                            </div>
                        )}
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
