/**
 * FollowUpLayout
 *
 * Shared state host for the Follow-Up module.
 * Owns ALL fetching, realtime subscriptions, and mutation handlers
 * previously in FollowUpDashboard.tsx monolith.
 *
 * Context + hook live in FollowUpContext.ts (Vite Fast Refresh separation).
 * Pattern mirrors TransportationLayout / FinanceLayout exactly.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, NavLink, useSearchParams, useLocation } from 'react-router-dom';
import { Calendar, Users, Database, Search, UserPlus, BarChart3, FileSearch } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useSafeAsync } from '../../hooks/useSafeAsync';
import { isServiceClosed } from '../../utils';
import { supabase } from '../../services/supabaseClient';
import { EventStore, mapEventFromDB } from '../../database/eventStore';
import { SoulsStore, mapSoulFromDB } from '../../database/soulsStore';
import { MemberStore } from '../../database/memberStore';
import { analyticsService } from '../../services/analyticsService';
import { MinistryEvent, Soul, Member } from '../../types';
import SoulEntryForm from '../../components/SoulEntryForm';
import { FollowUpContext, FollowUpContextValue } from './FollowUpContext';

const FollowUpLayout: React.FC = () => {
    const { user } = useAuth();
    const { showToast, confirm: showConfirm } = useNotification();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    // Determine active tab from current URL path
    const activeTab = location.pathname.split('/').pop() || 'services';

    // ── Event selection ──────────────────────────────────────────────────────
    const selectedEventId = searchParams.get('eventId') || null;
    const setSelectedEventId = useCallback((id: string | null) => {
        setSearchParams(prev => {
            if (id) prev.set('eventId', id);
            else prev.delete('eventId');
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    // ── Core data ─────────────────────────────────────────────────────────────
    const [events, setEvents] = useState<MinistryEvent[]>([]);
    const [services, setServices] = useState<MinistryEvent[]>([]);
    const [souls, setSouls] = useState<Soul[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ── Add soul form state ────────────────────────────────────────────────────
    const [showAddSoulForm, setShowAddSoulForm] = useState(false);
    const [editingSoul, setEditingSoul] = useState<Soul | null>(null);

    // ── Link copy ─────────────────────────────────────────────────────────────
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

    // ── Soul search (services detail view) ────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
    const [isSearchingMembers, setIsSearchingMembers] = useState(false);
    const searchRequest = useSafeAsync<Member[]>();

    useEffect(() => {
        if (searchQuery.length < 3) { setMemberSearchResults([]); return; }
        const t = setTimeout(() => {
            searchRequest.run(async () => {
                setIsSearchingMembers(true);
                const response = await MemberStore.getMembers(1, 10, searchQuery);
                return response.status === 'success' ? response.data : [];
            }).then(data => {
                setIsSearchingMembers(false);
                if (data) setMemberSearchResults(data);
            });
        }, 500);
        return () => { clearTimeout(t); searchRequest.cancel(); };
    }, [searchQuery]);

    // ── Database tab ──────────────────────────────────────────────────────────
    const [dbEventFilter, setDbEventFilter] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'soul-detail' | 'member-detail'>('list');
    const [selectedSoulDetails, setSelectedSoulDetails] = useState<any | null>(null);

    // ── Members DB tab ────────────────────────────────────────────────────────
    const [membersDb, setMembersDb] = useState<Member[]>([]);
    const [totalMembersDb, setTotalMembersDb] = useState(0);
    const [membersDbQuery, setMembersDbQuery] = useState('');
    const [debouncedMembersDbQuery, setDebouncedMembersDbQuery] = useState('');
    const [membersDbPage, setMembersDbPage] = useState(1);
    const [isSearchingMembersDb, setIsSearchingMembersDb] = useState(false);
    const itemsPerPage = 50;

    const [selectedMemberDetails, setSelectedMemberDetails] = useState<any | null>(null);
    const [isEditingMember, setIsEditingMember] = useState(false);
    const [memberFormData, setMemberFormData] = useState({
        name: '', phone: '', category: 'Member', residence: '',
        occupation: '', placeOfWork: '', followUpStatus: 'Pending', followUpNotes: ''
    });

    // ── Analysis tab ──────────────────────────────────────────────────────────
    const [analysisData, setAnalysisData] = useState<any[]>([]);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [analysisPage, setAnalysisPage] = useState(1);
    const analysisItemsPerPage = 50;
    const [viewModeAnalysis, setViewModeAnalysis] = useState<'list' | 'detail'>('list');
    const [selectedAnalysisMember, setSelectedAnalysisMember] = useState<any | null>(null);

    // ── Debounce members query ────────────────────────────────────────────────
    useEffect(() => {
        const h = setTimeout(() => setDebouncedMembersDbQuery(membersDbQuery), 500);
        return () => clearTimeout(h);
    }, [membersDbQuery]);

    // ── Fetch members DB ──────────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab !== 'members') return;
        const fetchMembers = async () => {
            setIsSearchingMembersDb(true);
            try {
                const res = await MemberStore.getMembers(membersDbPage, itemsPerPage, debouncedMembersDbQuery);
                if (res.status === 'success' && Array.isArray(res.data)) {
                    setMembersDb(res.data);
                    setTotalMembersDb(res.count || res.data.length);
                }
            } catch (e) { console.error('Failed to load members', e); }
            finally { setIsSearchingMembersDb(false); }
        };
        fetchMembers();
    }, [activeTab, membersDbPage, debouncedMembersDbQuery]);

    // ── Fetch analysis ────────────────────────────────────────────────────────
    useEffect(() => {
        if (activeTab !== 'analysis') return;
        const loadAnalysis = async () => {
            setIsLoadingAnalysis(true);
            try {
                const data = await analyticsService.fetchFollowUpAnalysis();
                setAnalysisData(data);
            } catch { showToast('Failed to load analysis', 'error'); }
            finally { setIsLoadingAnalysis(false); }
        };
        loadAnalysis();
    }, [activeTab]);

    // ── Core data load ────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const eventsResp = await EventStore.getAll();
            const allEvents = eventsResp.status === 'success' ? eventsResp.data : [];
            setEvents(allEvents.filter(e => e.type === 'Event'));
            setServices(allEvents.filter(e => e.type === 'Service'));
            const allSouls = await SoulsStore.getAll(dbEventFilter);
            setSouls(allSouls);
        } catch (e) { console.error('Failed to load dashboard data', e); }
        finally { setIsLoading(false); }
    }, [dbEventFilter]);

    const loadDataRef = useRef(loadData);
    loadDataRef.current = loadData;

    useEffect(() => {
        loadDataRef.current();

        // Global realtime for events list
        const channel = supabase.channel('followup-events-global')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ministry_events' }, ({ eventType, new: n, old: o }) => {
                if (eventType === 'INSERT') {
                    const mapped = mapEventFromDB(n);
                    if (mapped.type === 'Service') setServices(prev => [mapped, ...prev]);
                    else setEvents(prev => [mapped, ...prev]);
                } else if (eventType === 'UPDATE') {
                    const mapped = mapEventFromDB(n);
                    setServices(prev => prev.map(s => s.id === mapped.id ? mapped : s));
                    setEvents(prev => prev.map(e => e.id === mapped.id ? mapped : e));
                } else if (eventType === 'DELETE') {
                    setServices(prev => prev.filter(s => s.id !== o.id));
                    setEvents(prev => prev.filter(e => e.id !== o.id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Reload souls when database filter changes
    useEffect(() => {
        if (activeTab === 'database') loadDataRef.current();
    }, [dbEventFilter, activeTab]);

    // Scoped realtime for souls
    useEffect(() => {
        const channelName = selectedEventId ? `followup-souls-scoped-${selectedEventId}` : 'followup-souls-global';
        const filter = selectedEventId ? `source_id=eq.${selectedEventId}` : undefined;
        const channel = supabase.channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'souls', filter }, ({ eventType, new: n, old: o }) => {
                if (eventType === 'INSERT') {
                    const mapped = mapSoulFromDB(n);
                    setSouls(prev => prev.some(s => s.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (eventType === 'UPDATE') {
                    const mapped = mapSoulFromDB(n);
                    setSouls(prev => prev.map(s => s.id === mapped.id ? mapped : s));
                } else if (eventType === 'DELETE') {
                    setSouls(prev => prev.filter(s => s.id !== o.id));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [selectedEventId]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleCopyLink = (eventId: string) => {
        const link = `${window.location.origin}/collect-souls/${eventId}`;
        navigator.clipboard.writeText(link);
        setCopiedLinkId(eventId);
        setTimeout(() => setCopiedLinkId(null), 2000);
    };

    const handleAddSoul = async (soulData: Omit<Soul, 'id' | 'createdAt'>) => {
        if (!soulData.eventId && (soulData.sourceType === 'Event' || soulData.sourceType === 'Service')) {
            showToast('Please select an event or service first.', 'error');
            return;
        }
        try {
            if (editingSoul) {
                await SoulsStore.update({ ...soulData, id: editingSoul.id, createdAt: editingSoul.createdAt } as Soul);
                showToast('Soul updated successfully', 'success');
            } else {
                await SoulsStore.add(soulData as Soul);
                showToast('Soul added successfully', 'success');
            }
            setShowAddSoulForm(false);
            setEditingSoul(null);
        } catch (e) {
            console.error('Failed to save soul', e);
            showToast('Failed to save. Please try again.', 'error');
        }
    };

    const handleViewSoul = async (soulId: string) => {
        setIsLoading(true);
        try {
            const details = await SoulsStore.getSoulDetails(soulId);
            setSelectedSoulDetails(details);
            setViewMode('soul-detail');
        } catch { showToast('Failed to load soul details', 'error'); }
        finally { setIsLoading(false); }
    };

    const handleViewMemberDb = async (id: string) => {
        setIsLoading(true);
        try {
            const details = await MemberStore.getMemberDetails(id);
            setSelectedMemberDetails(details);
            setViewMode('member-detail');
            setMemberFormData({
                name: details.member.name || '',
                phone: details.member.phone || '',
                category: details.member.category || 'Member',
                residence: details.member.residency || '',
                occupation: details.member.occupation || '',
                placeOfWork: details.member.placeOfWork || '',
                followUpStatus: details.member.followUpStatus || 'Pending',
                followUpNotes: details.member.followUpNotes || ''
            });
        } catch { showToast('Failed to load member details', 'error'); }
        finally { setIsLoading(false); }
    };

    const handleUpdateMemberDb = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await MemberStore.update({ ...selectedMemberDetails.member, ...memberFormData });
            showToast('Member profile updated successfully', 'success');
            setIsEditingMember(false);
            handleViewMemberDb(selectedMemberDetails.member.id);
        } catch { showToast('Failed to update member profile', 'error'); }
    };

    const handleViewAnalysisDetail = async (id: string, basicRecord: any) => {
        setIsLoadingAnalysis(true);
        try {
            const details = await MemberStore.getMemberDetails(id);
            setSelectedAnalysisMember(details);
            setMemberFormData(prev => ({
                ...prev,
                followUpStatus: basicRecord?.followUpStatus || 'Pending',
                followUpNotes: basicRecord?.followUpNotes || ''
            }));
            setViewModeAnalysis('detail');
        } catch { showToast('Failed to load member details', 'error'); }
        finally { setIsLoadingAnalysis(false); }
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
            setAnalysisData(prev => prev.map(d => d.id === selectedAnalysisMember.member.id
                ? { ...d, followUpStatus: memberFormData.followUpStatus, followUpNotes: memberFormData.followUpNotes }
                : d));
            setViewModeAnalysis('list');
        } catch { showToast('Failed to save follow-up', 'error'); }
    };

    // ── Nav tabs ──────────────────────────────────────────────────────────────
    const navTabs = [
        { to: 'services',     icon: Calendar,    label: 'Services',        mobileLabel: 'Services' },
        { to: 'events',       icon: Users,        label: 'Events',          mobileLabel: 'Events' },
        { to: 'database',     icon: Database,     label: 'Souls Database',  mobileLabel: 'Souls' },
        { to: 'first-timers', icon: UserPlus,     label: 'First Timers',    mobileLabel: 'Timers' },
        { to: 'members',      icon: Database,     label: 'Members DB',      mobileLabel: 'Members' },
        { to: 'analysis',     icon: BarChart3,    label: 'Needs Follow Up', mobileLabel: 'Follow Up' },
        { to: 'queries',      icon: FileSearch,   label: 'Queries',         mobileLabel: 'Queries' },
    ];

    // ── Context value ─────────────────────────────────────────────────────────
    const contextValue: FollowUpContextValue = {
        selectedEventId, setSelectedEventId,
        events, services, souls, isLoading,
        loadData,
        showAddSoulForm, setShowAddSoulForm,
        editingSoul, setEditingSoul,
        handleAddSoul,
        copiedLinkId, handleCopyLink,
        searchQuery, setSearchQuery,
        memberSearchResults, isSearchingMembers,
        dbEventFilter, setDbEventFilter,
        viewMode, setViewMode: setViewMode as any,
        selectedSoulDetails,
        handleViewSoul,
        membersDb, totalMembersDb,
        membersDbQuery, setMembersDbQuery,
        membersDbPage, setMembersDbPage,
        isSearchingMembersDb, itemsPerPage,
        selectedMemberDetails, isEditingMember, setIsEditingMember,
        memberFormData, setMemberFormData,
        handleViewMemberDb, handleUpdateMemberDb,
        analysisData, isLoadingAnalysis,
        analysisPage, setAnalysisPage,
        analysisItemsPerPage,
        viewModeAnalysis, setViewModeAnalysis,
        selectedAnalysisMember,
        handleViewAnalysisDetail, handleSaveFollowUp,
        activeTab,
    };

    return (
        <FollowUpContext.Provider value={contextValue}>
            <div className="flex flex-col min-h-full bg-gray-50">
                {/* Desktop Top Nav — hidden on mobile */}
                <div className="hidden md:flex bg-white border-b border-gray-200 px-6 py-3 items-center gap-1 flex-wrap sticky top-0 z-20">
                    {navTabs.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setSelectedEventId(null)}
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'bg-black text-white'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }`
                            }
                        >
                            <Icon className="w-4 h-4" /> {label}
                        </NavLink>
                    ))}
                </div>

                <div className="flex-1 mb-20 md:mb-0">
                    <React.Suspense fallback={<div className="flex items-center justify-center h-full w-full min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div></div>}>
<Outlet />
</React.Suspense>
                </div>
            </div>

            {/* ── Mobile Floating Bottom Navigation ────────────────────────── */}
            <div className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg">
                <div className="flex items-center justify-between gap-1 bg-white/75 backdrop-blur-2xl p-2 rounded-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    {navTabs.map(({ to, icon: Icon, mobileLabel }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setSelectedEventId(null)}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center w-full py-2 rounded-full transition-all duration-300 relative overflow-hidden ${
                                    isActive ? 'text-ministry-neon' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div className="absolute inset-0 bg-black rounded-full scale-100 animate-in zoom-in duration-300" />
                                    )}
                                    <div className="relative z-10 flex flex-col items-center gap-1">
                                        <Icon strokeWidth={isActive ? 2.5 : 2} className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'text-ministry-neon scale-110' : ''}`} />
                                        <span className={`text-[9px] tracking-wide transition-all duration-300 ${isActive ? 'font-bold text-ministry-neon' : 'font-medium'}`}>
                                            {mobileLabel}
                                        </span>
                                    </div>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* ── Soul Add/Edit Modal ──────────────────────────────────────── */}
            {showAddSoulForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <SoulEntryForm
                            sourceType={activeTab === 'events' ? 'Event' : 'Service'}
                            sourceId={selectedEventId || ''}
                            sourceName={
                                (activeTab === 'events' ? events : services).find(e => e.id === selectedEventId)?.title
                            }
                            eventId={selectedEventId || undefined}
                            capturedBy={user?.id || ''}
                            initialData={editingSoul || undefined}
                            onSubmit={handleAddSoul}
                            onCancel={() => {
                                setShowAddSoulForm(false);
                                setEditingSoul(null);
                            }}
                        />
                    </div>
                </div>
            )}
        </FollowUpContext.Provider>
    );
};

export default FollowUpLayout;
