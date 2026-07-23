/**
 * ResidentCoordinatorLayout
 *
 * Shared state host for the Resident Coordinator (my-residency) module.
 * Owns ALL fetching and mutation handlers previously in CoordinatorResidencyDashboard.tsx.
 *
 * Context + hook live in ResidentCoordinatorContext.ts (Vite Fast Refresh separation).
 * Pattern mirrors TransportationLayout / FinanceLayout / FollowUpLayout exactly.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { ClipboardList, Users, Calendar, Home, MapPin, Activity, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useResidentStore } from '../../database/residentStore';
import { EventStore } from '../../database/eventStore';
import { VehicleStore } from '../../database/vehicleStore';
import { SoulsStore } from '../../database/soulsStore';
import { Member, MinistryEvent, Passenger, ResidenceOutreachReport, Soul } from '../../types';
import { ResidentCoordinatorContext, ResidentCoordinatorContextValue } from './ResidentCoordinatorContext';

const ResidentCoordinatorLayout: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useNotification();
    const { residences, fetchResidences, fetchResidenceMembers, addReport, reports, fetchReports } = useResidentStore();

    // ── Core data ─────────────────────────────────────────────────────────────
    const [myResidence, setMyResidence] = useState<any | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [events, setEvents] = useState<MinistryEvent[]>([]);
    const [residenceSouls, setResidenceSouls] = useState<Soul[]>([]);
    const [isLoadingInit, setIsLoadingInit] = useState(true);

    // ── Event confirmation state ───────────────────────────────────────────────
    const [selectedEvent, setSelectedEvent] = useState<MinistryEvent | null>(null);
    const [confirmedPassengers, setConfirmedPassengers] = useState<Passenger[]>([]);

    // ── Report submission state ────────────────────────────────────────────────
    const [newReport, setNewReport] = useState<Partial<ResidenceOutreachReport>>({
        date: new Date().toISOString().split('T')[0],
        souls_won: 0,
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Initialize: fetch residences + reports ────────────────────────────────
    useEffect(() => {
        const init = async () => {
            setIsLoadingInit(true);
            try {
                await fetchResidences();
                await fetchReports();
            } catch (err) {
                console.error('Failed to fetch residences:', err);
            }
        };
        init();
    }, [fetchResidences]);

    // ── Find coordinator's residence by email ─────────────────────────────────
    useEffect(() => {
        if (residences.length > 0 && user?.email) {
            const match = residences.find(r => r.coordinatorEmail?.toLowerCase() === user.email?.toLowerCase());
            setMyResidence(match || null);
            setIsLoadingInit(false);
        } else if (residences.length > 0) {
            setIsLoadingInit(false);
        }
    }, [residences, user]);

    // ── Load members, events, souls when residence is found ───────────────────
    useEffect(() => {
        if (!myResidence?.id) return;

        fetchResidenceMembers(myResidence.id as string).then(data => {
            setMembers(data || []);
        });

        EventStore.getAll({ limit: 50 }).then(resp => {
            if (resp.status === 'success') {
                setEvents((resp.data || []).filter(e => e.type === 'Event'));
            }
        });

        SoulsStore.getBySourceType('Residential').then(souls => {
            setResidenceSouls(souls);
        });
    }, [myResidence, fetchResidenceMembers]);

    // ── Load confirmed passengers when event is selected ─────────────────────
    useEffect(() => {
        if (!selectedEvent || !myResidence) return;
        const loadConfirmations = async () => {
            try {
                const response = await VehicleStore.getPassengers({ eventId: selectedEvent.id });
                if (response.status === 'success') {
                    const residencyConfirmations = response.data.filter(
                        p => p.residence?.toLowerCase() === myResidence.name.toLowerCase()
                    );
                    setConfirmedPassengers(residencyConfirmations);
                }
            } catch (e) {
                console.error('Failed to load confirmed passengers:', e);
            }
        };
        loadConfirmations();
    }, [selectedEvent, myResidence]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleConfirmToggle = useCallback(async (member: Member) => {
        if (!selectedEvent || !myResidence) return;
        const isConfirmed = confirmedPassengers.some(p => p.name === member.name);

        if (isConfirmed) {
            const passengerToDelete = confirmedPassengers.find(p => p.name === member.name);
            if (passengerToDelete?.id) {
                try {
                    await VehicleStore.deletePassenger(passengerToDelete.id);
                    setConfirmedPassengers(prev => prev.filter(p => p.id !== passengerToDelete.id));
                } catch (e) { console.error('Failed to unconfirm:', e); }
            }
        } else {
            const newPassenger: Passenger = {
                id: '',
                name: member.name,
                contact: member.phone || '',
                category: (() => {
                    const valid = ['Member', 'Student', 'Institution'] as const;
                    return (valid.includes(member.category as any) ? member.category : 'Member') as typeof valid[number];
                })(),
                residence: myResidence.name,
                eventId: selectedEvent.id,
                vehicleId: '',
                isFirstTime: 'No',
                verified: false,
                gender: (() => {
                    const valid = ['Male', 'Female'] as const;
                    return (valid.includes(member.gender as any) ? member.gender : 'Male') as typeof valid[number];
                })(),
                boardingType: 'Day',
                soulWon: false
            };
            try {
                const response = await VehicleStore.addPassenger(newPassenger);
                if (response.status === 'success' && response.data) {
                    setConfirmedPassengers(prev => [...prev, response.data!]);
                }
            } catch (e) { console.error('Failed to confirm:', e); }
        }
    }, [selectedEvent, myResidence, confirmedPassengers]);

    const handleAddReport = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myResidence?.id) return;
        setIsSubmitting(true);
        try {
            await addReport({
                ...newReport,
                residence_id: myResidence.id as string
            } as Omit<ResidenceOutreachReport, 'id' | 'manifest_id' | 'created_at' | 'updated_at'>);
            showToast('Outreach report submitted successfully!', 'success');
            setNewReport({ date: new Date().toISOString().split('T')[0], souls_won: 0, notes: '' });
        } catch (err: any) {
            console.error('Failed to add report:', err);
            showToast(err.message || 'Failed to submit report', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [myResidence, newReport, addReport, showToast]);

    // ── Loading state ─────────────────────────────────────────────────────────
    if (isLoadingInit) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-ministry-orange" />
            </div>
        );
    }

    // ── No residence assigned ─────────────────────────────────────────────────
    if (!myResidence) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-center mt-20">
                <div className="bg-orange-50 p-6 rounded-2xl inline-block mb-4">
                    <MapPin className="w-12 h-12 text-orange-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">No Residency Assigned</h1>
                <p className="text-gray-500">
                    Your account ({user?.email}) is not currently assigned as a coordinator for any residential area.
                    Please contact an administrator if you believe this is an error.
                </p>
            </div>
        );
    }

    // ── Context value ─────────────────────────────────────────────────────────
    const contextValue: ResidentCoordinatorContextValue = {
        myResidence,
        members,
        events,
        residenceSouls,
        reports: reports as any,
        isLoadingInit,
        selectedEvent, setSelectedEvent,
        confirmedPassengers, handleConfirmToggle,
        newReport, setNewReport,
        handleAddReport, isSubmitting,
    };

    const totalSoulsWon =
        reports.filter((r: any) => r.residence_id === myResidence.id).reduce((sum: number, r: any) => sum + r.souls_won, 0) +
        residenceSouls.filter(s => s.sourceId === myResidence.id).length;

    const navTabs = [
        { to: 'reports',  icon: ClipboardList, label: 'Outreach Reports' },
        { to: 'members',  icon: Users,         label: 'Community Members' },
        { to: 'events',   icon: Calendar,      label: 'Events' },
    ];

    return (
        <ResidentCoordinatorContext.Provider value={contextValue}>
            <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 min-h-full">

                {/* ── Hero Header ──────────────────────────────────────────── */}
                <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Home className="w-48 h-48 transform rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-ministry-orange mb-2 font-medium">
                            <MapPin className="w-5 h-5" />
                            <span>Assigned Residential Area</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{myResidence.name}</h1>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                <Users className="w-4 h-4" /><span>{members.length} Members</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                <ClipboardList className="w-4 h-4" /><span>Coordinator View</span>
                            </div>
                            <button
                                onClick={() => {
                                    const link = `${window.location.origin}/collect-residency-souls/${myResidence.id}`;
                                    navigator.clipboard.writeText(link);
                                    showToast('Public Link copied to clipboard!', 'success');
                                }}
                                className="flex items-center gap-1.5 bg-ministry-orange text-white px-4 py-1.5 rounded-full font-bold shadow-sm hover:bg-orange-600 transition-colors cursor-pointer"
                            >
                                <LinkIcon className="w-4 h-4" /><span>Copy Public Entry Link</span>
                            </button>
                        </div>
                    </div>
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-end">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-right">
                            <div className="flex items-center gap-2 justify-end text-orange-200 mb-1">
                                <Activity className="w-4 h-4" />
                                <span className="text-sm font-semibold uppercase tracking-wider">Total Souls Won</span>
                            </div>
                            <div className="text-4xl font-extrabold text-white">{totalSoulsWon}</div>
                        </div>
                    </div>
                </div>

                {/* ── NavLink tabs ─────────────────────────────────────────── */}
                <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit overflow-x-auto">
                    {navTabs.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => { if (to !== 'events') setSelectedEvent(null); }}
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-ministry-orange' : ''}`} />
                                    <span>{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>

                {/* ── Tab content ───────────────────────────────────────────── */}
                <div>
                    <React.Suspense fallback={<div className="flex items-center justify-center h-full w-full min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div></div>}>
<Outlet />
</React.Suspense>
                </div>
            </div>
        </ResidentCoordinatorContext.Provider>
    );
};

export default ResidentCoordinatorLayout;
