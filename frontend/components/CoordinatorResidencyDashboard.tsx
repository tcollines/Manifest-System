import React, { useState, useEffect, useMemo } from 'react';
import { Home, Users, Search, Filter, FileText, ChevronRight, Phone, Target, TrendingUp, Calendar, MapPin, CheckCircle2, Circle, ClipboardList, Loader2, Link as LinkIcon } from 'lucide-react';
import { MemberStore } from '../database/memberStore';
import { EventStore } from '../database/eventStore'; // Added to fetch active events
import { VehicleStore } from '../database/vehicleStore'; // Added to store passenger confirmations
import { useResidentStore } from '../database/residentStore';
import { useNotification } from './ui/NotificationSystem';
import { Member, Residence, MinistryEvent, Passenger, User, ResidenceOutreachReport } from '../types';

interface CoordinatorResidencyDashboardProps {
    currentUser: User | null;
}

const CoordinatorResidencyDashboard: React.FC<CoordinatorResidencyDashboardProps> = ({ currentUser }) => {
    const { residences, fetchResidences, fetchResidenceMembers, addReport, reports, fetchReports } = useResidentStore();
    const { showToast } = useNotification();
    const [myResidence, setMyResidence] = useState<Residence | null>(null);
    const [events, setEvents] = useState<MinistryEvent[]>([]); // New state for events
    const [confirmedPassengers, setConfirmedPassengers] = useState<Passenger[]>([]); // New state for event confirmations
    const [selectedEvent, setSelectedEvent] = useState<MinistryEvent | null>(null); // State for Custom Event view
    const [activeTab, setActiveTab] = useState<'reports' | 'members' | 'events'>('reports'); // Added 'events' tab
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoadingInit, setIsLoadingInit] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const totalSoulsWon = useMemo(() => {
        if (!myResidence?.id || !reports) return 0;
        return reports
            .filter(r => r.residenceId === myResidence.id || (r as any).residence_id === myResidence.id)
            .reduce((sum, r) => sum + (Number(r.soulsWon) || Number((r as any).souls_won) || 0), 0);
    }, [reports, myResidence]);

    const [newReport, setNewReport] = useState<Partial<ResidenceOutreachReport>>({
        date: new Date().toISOString().split('T')[0],
        souls_won: 0,
        notes: ''
    });

    useEffect(() => {
        const init = async () => {
            setIsLoadingInit(true);
            try {
                // Force a fresh fetch to ensure we have the latest residences
                await fetchResidences();
            } catch (err) {
                console.error("Failed to fetch residences:", err);
            }
        };
        init();
    }, [fetchResidences]);

    useEffect(() => {
        // Find the residency matching the coordinator's email
        if (residences.length > 0 && currentUser?.email) {
            const match = residences.find(r => r.coordinatorEmail?.toLowerCase() === currentUser.email?.toLowerCase());
            setMyResidence(match || null);
            setIsLoadingInit(false);
        } else if (residences.length > 0) {
            setIsLoadingInit(false);
        }
    }, [residences, currentUser]);

    useEffect(() => {
        // If we found their residency, load their members and events
        if (myResidence?.id) {
            fetchResidenceMembers(myResidence.id as string).then(data => {
                setMembers(data || []);
            });
            EventStore.getAll({ limit: 50 }).then(eventsResponse => {
                if (eventsResponse.status === 'success') {
                    const allEvents = eventsResponse.data || [];
                    setEvents(allEvents.filter(e => e.type === 'Event'));
                }
            });
        }
    }, [myResidence, fetchResidenceMembers]);

    // Load confirmed passengers when a specific event is selected
    useEffect(() => {
        if (!selectedEvent) return;

        const loadConfirmations = async () => {
            try {
                const response = await VehicleStore.getPassengers({ eventId: selectedEvent.id });
                if (response.status === 'success') {
                    const residencyConfirmations = response.data.filter(
                         p => p.residence?.toLowerCase() === myResidence?.name.toLowerCase()
                    );
                    setConfirmedPassengers(residencyConfirmations);
                }
            } catch (e) {
                console.error("Failed to load confirmed passengers:", e);
            }
        };
        loadConfirmations();
    }, [selectedEvent, myResidence]);

    const handleConfirmToggle = async (member: Member) => {
        if (!selectedEvent || !myResidence) return;

        const isConfirmed = confirmedPassengers.some(p => p.name === member.name);

        if (isConfirmed) {
            // Find the passenger record to delete
            const passengerToDelete = confirmedPassengers.find(p => p.name === member.name);
            if (passengerToDelete && passengerToDelete.id) {
                try {
                    await VehicleStore.deletePassenger(passengerToDelete.id);
                    setConfirmedPassengers(prev => prev.filter(p => p.id !== passengerToDelete.id));
                } catch (e) {
                    console.error("Failed to unconfirm:", e);
                }
            }
        } else {
            // Add member as new passenger for this event
            const newPassenger: Passenger = {
                id: '', // let backend generate
                name: member.name,
                contact: member.phone || '',
                category: (() => {
                    const validCategories = ['Member', 'Student', 'Institution'] as const;
                    type ValidCategory = typeof validCategories[number];
                    return (validCategories.includes(member.category as any) ? member.category : 'Member') as ValidCategory;
                })(),
                residence: myResidence.name,
                eventId: selectedEvent.id, // Target the selected event!
                vehicleId: '', // Empty vehicleId for initial confirmation
                isFirstTime: 'No',
                verified: false,
                gender: (() => {
                    const validGenders = ['Male', 'Female'] as const;
                    type ValidGender = typeof validGenders[number];
                    return (validGenders.includes(member.gender as any) ? member.gender : 'Male') as ValidGender;
                })(),
                boardingType: 'Day',
                soulWon: false
            };

            try {
                const response = await VehicleStore.addPassenger(newPassenger);
                if (response.status === 'success' && response.data) {
                    setConfirmedPassengers(prev => [...prev, response.data!]);
                }
            } catch (e) {
                console.error("Failed to confirm:", e);
            }
        }
    };

    const handleAddReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myResidence?.id) return;

        setIsSubmitting(true);
        try {
            await addReport({
                ...newReport,
                residence_id: myResidence.id as string
            } as Omit<ResidenceOutreachReport, 'id' | 'manifest_id' | 'created_at' | 'updated_at'>);

            showToast("Outreach report submitted successfully!", "success");
            setNewReport({ date: new Date().toISOString().split('T')[0], souls_won: 0, notes: '' });
        } catch (err: any) {
            console.error("Failed to add report:", err);
            showToast(err.message || "Failed to submit report", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingInit) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-ministry-orange" />
            </div>
        );
    }

    if (!myResidence) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-center mt-20">
                <div className="bg-orange-50 p-6 rounded-2xl inline-block mb-4">
                    <MapPin className="w-12 h-12 text-orange-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">No Residency Assigned</h1>
                <p className="text-gray-500">
                    Your account ({currentUser?.email}) is not currently assigned as a coordinator for any residential area.
                    Please contact an administrator if you believe this is an error.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header Area */}
            <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                {/* Decorative background element */}
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
                            <Users className="w-4 h-4" />
                            <span>{members.length} Members</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            <Target className="w-4 h-4 text-orange-400" />
                            <span className="font-semibold text-white">{totalSoulsWon} Souls Won</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            <ClipboardList className="w-4 h-4" />
                            <span>Coordinator View</span>
                        </div>
                        
                        <button 
                            onClick={() => {
                                const link = `${window.location.origin}/collect-residency-souls/${myResidence.id}`;
                                navigator.clipboard.writeText(link);
                                showToast('Public Link copied to clipboard!', 'success');
                            }}
                            className="flex items-center gap-1.5 bg-ministry-orange text-white px-4 py-1.5 rounded-full font-bold shadow-sm hover:bg-orange-600 transition-colors cursor-pointer"
                        >
                            <LinkIcon className="w-4 h-4" />
                            <span>Copy Public Entry Link</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-white/60 backdrop-blur-md p-1.5 rounded-full max-w-full overflow-x-auto hide-scrollbar shadow-sm border border-gray-200/50">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <ClipboardList className={`w-4 h-4 ${activeTab === 'reports' ? 'text-ministry-orange' : ''}`} />
                    <span>Outreach Reports</span>
                </button>
                <button
                    onClick={() => { setActiveTab('members'); setSelectedEvent(null); }}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'members' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <Users className={`w-4 h-4 ${activeTab === 'members' ? 'text-ministry-orange' : ''}`} />
                    <span>Community Members</span>
                </button>
                <button
                    onClick={() => { setActiveTab('events'); setSelectedEvent(null); }}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'events' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <Calendar className={`w-4 h-4 ${activeTab === 'events' ? 'text-ministry-orange' : ''}`} />
                    <span>Events</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="mt-6">
                {activeTab === 'reports' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* New Report Form */}
                        <div className="md:col-span-1">
                            <form onSubmit={handleAddReport} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-24">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mr-3">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    Submit Report
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={newReport.date || ''}
                                            onChange={e => setNewReport({ ...newReport, date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ministry-orange focus:border-ministry-orange"
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Souls Won</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={newReport.souls_won || 0}
                                            onChange={e => setNewReport({ ...newReport, souls_won: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ministry-orange focus:border-ministry-orange"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Testimonies (Optional)</label>
                                        <textarea
                                            value={newReport.notes || ''}
                                            onChange={e => setNewReport({ ...newReport, notes: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-ministry-orange focus:border-ministry-orange h-32 resize-none"
                                            placeholder="Share highlights from the outreach..."
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full mt-6 bg-ministry-orange text-white py-2.5 rounded-xl font-bold hover:bg-orange-600 transition-colors flex justify-center items-center disabled:opacity-70"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Report'}
                                </button>
                            </form>
                        </div>

                        {/* Information / History Context Area (Simplified for now) */}
                        <div className="md:col-span-2">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center h-full flex flex-col justify-center items-center">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                    <Calendar className="w-8 h-8 text-blue-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Track Your Impact</h3>
                                <p className="text-gray-500 max-w-md mx-auto">
                                    Use the form to log souls won during community outreach. Your entries help track total community growth across all residential areas.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'members' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center text-lg">
                                <Users className="w-5 h-5 mr-2 text-gray-500" />
                                Residence Roster
                            </h3>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                                {members.length} Total
                            </span>
                        </div>

                        {members.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {members.map((m, idx) => (
                                    <div key={m.id || idx} className="p-4 md:p-6 hover:bg-orange-50/30 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 rounded-full flex items-center justify-center font-bold text-gray-600 shadow-sm text-lg">
                                                {m.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-lg">{m.name}</h4>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                    <span>{m.phone || 'No phone number'}</span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                        {m.category || 'Member'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center flex flex-col items-center">
                                <div className="bg-gray-50 p-4 rounded-full mb-4">
                                    <Users className="w-8 h-8 text-gray-400" />
                                </div>
                                <h4 className="text-lg font-bold text-gray-900">No Members Added Yet</h4>
                                <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                                    Members assigned to {myResidence.name} by administrators will appear here.
                                </p>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'events' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {!selectedEvent ? (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-gray-900">Ministry Events</h2>
                                    <p className="text-sm text-gray-500">Select an event to build your confirmed list</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {events.map((event) => (
                                        <div
                                            key={event.id}
                                            onClick={() => setSelectedEvent(event)}
                                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                                    {event.type}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-900 mb-1">{event.title}</h3>
                                            <div className="space-y-1 mt-3">
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                                    {event.date} {event.time && `• ${event.time}`}
                                                </div>
                                                {event.location && (
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                                        {event.location}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                <span className="text-sm font-medium text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                                                    Build List <ChevronRight className="w-4 h-4 ml-1" />
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {events.length === 0 && (
                                        <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <h3 className="text-lg font-medium text-gray-900">No Events Found</h3>
                                            <p className="text-sm text-gray-500 mt-1">There are no upcoming events currently listed.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Selected Event Header */}
                                <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <button 
                                            onClick={() => setSelectedEvent(null)}
                                            className="text-sm text-blue-600 flex items-center hover:underline mb-2"
                                        >
                                            <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Back to Events
                                        </button>
                                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                            <Target className="w-5 h-5 text-blue-500" />
                                            Confirmed List: {selectedEvent.title}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {selectedEvent.date} • {myResidence.name}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Confirmed</div>
                                                <div className="text-xl font-bold text-gray-900 leading-none mt-1">
                                                    {confirmedPassengers.length} <span className="text-sm text-gray-400 font-normal">/ {members.length}</span>
                                                </div>
                                            </div>
                                            <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center relative">
                                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                                                {confirmedPassengers.length > 0 && (
                                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Community Members List for Confirmation */}
                                <div className="divide-y divide-gray-100">
                                    {members.map((member) => {
                                        const isConfirmed = confirmedPassengers.some(p => p.name === member.name);
                                        return (
                                            <div key={member.id} className={`p-4 sm:p-5 flex items-center justify-between transition-colors ${isConfirmed ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isConfirmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {member.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                                            {member.name}
                                                        </h3>
                                                        <div className="flex items-center text-sm text-gray-500 mt-0.5 space-x-3">
                                                            <span>{member.phone || 'No Phone'}</span>
                                                            {member.gender && <span>• {member.gender}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleConfirmToggle(member)}
                                                    className={`
                                                        px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-sm
                                                        ${isConfirmed 
                                                            ? 'bg-green-500 text-white hover:bg-green-600 border border-transparent' 
                                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'}
                                                    `}
                                                >
                                                    {isConfirmed ? (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Confirmed
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Circle className="w-4 h-4 text-gray-400" />
                                                            Confirm
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                    
                                    {members.length === 0 && (
                                        <div className="py-12 text-center">
                                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <h3 className="text-lg font-medium text-gray-900">No Members Found</h3>
                                            <p className="text-sm text-gray-500 mt-1">Add members to this residency first before building a confirmed list.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Add Plus icon locally if not imported globally in this file usually
const Plus = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

export default CoordinatorResidencyDashboard;
