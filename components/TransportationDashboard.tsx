
import React, { useState, useEffect, useRef } from 'react';
import PhoneInput from './PhoneInput';
import { MOCK_EVENTS, PICKUP_STATIONS } from '../constants';
import { MinistryEvent, Vehicle, User, Passenger, JourneyStage, ModalType, Soul } from '../types';
import EventDetailsModal from './EventDetailsModal';
import { VehicleStore } from '../database/vehicleStore';
import { UserStore } from '../database/userStore';
import { LogisticsStore, ExtendedStation } from '../database/logisticsStore';
import { SoulsStore } from '../database/soulsStore';
import { supabase } from '../services/supabaseClient';
import { validateContact, isEventLocked } from '../utils';
import {
    Bus,
    Navigation,
    AlertTriangle,
    CheckCircle,
    UserPlus,
    ChevronRight,
    Search,
    ShieldAlert,
    Users,
    Trash2,
    Key,
    CreditCard as IdCard,
    MapPin,
    FileCheck,
    DollarSign,
    ArrowRight,
    Printer,
    Circle,
    Check,
    Plus,
    ThumbsUp,
    RefreshCw,
    ArrowLeft,
    LayoutList,
    Activity,
    Heart,
    Phone,
    Package
} from 'lucide-react';
import { AssetsTab } from './AssetsTab';



import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';

const mapContainerStyle = {
    width: '100%',
    height: '100%'
};

const center = {
    lat: 0.3476,
    lng: 32.5825
};


interface TransportationDashboardProps {
    currentUser?: User | null;
    events?: MinistryEvent[];
    onOpenModal?: (type: ModalType) => void;
}

// Extended interface for local state tracking (simulation)
interface TrackedVehicle extends Omit<Vehicle, 'status'> {
    status?: 'Pending' | 'Approved' | 'En Route' | 'Arrived' | 'Completed';
    progress: number; // 0-100
    eta: string;
    isDelayed: boolean;
    coordinates?: { x: number; y: number }; // Retained for fallback
}

const TransportationDashboard: React.FC<TransportationDashboardProps> = ({ currentUser, events = MOCK_EVENTS, onOpenModal }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'coordinators' | 'assets'>(() =>
        (localStorage.getItem('transportation_active_tab') as 'overview' | 'coordinators' | 'assets') || 'overview'
    );

    // Persist activeTab changes
    useEffect(() => {
        localStorage.setItem('transportation_active_tab', activeTab);
    }, [activeTab]);

    const [selectedEventId, setSelectedEventId] = useState<string>(events.find(e => (e.type === 'Event' || e.type === 'Service'))?.id || '');
    const selectedEvent = events.find(e => e.id === selectedEventId);
    const [showHighlights, setShowHighlights] = useState(false);

    const [vehicles, setVehicles] = useState<TrackedVehicle[]>([]);
    const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'En Route' | 'Arrived' | 'Completed'>('All');

    const [coordinators, setCoordinators] = useState<User[]>([]);
    const [newCoordinator, setNewCoordinator] = useState({ name: '', username: '', password: '', contact: '' });


    const [isAssigning, setIsAssigning] = useState<string | null>(null);
    const [selectedCoordinator, setSelectedCoordinator] = useState('');

    // --- COORDINATOR SPECIFIC STATE ---
    const isCoordinatorView = currentUser?.role === 'Coordinator';
    const [myVehicle, setMyVehicle] = useState<Vehicle | null>(null);
    const [activeJourneyTab, setActiveJourneyTab] = useState<'Ongoing' | 'Return'>('Ongoing');
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [isVehicleOpen, setIsVehicleOpen] = useState(false);
    const [returnPassengerForm, setReturnPassengerForm] = useState({
        name: '',
        contact: '',
        residence: ''
    });
    const lastLocationUpdate = useRef(0);
    const [dbStations, setDbStations] = useState<ExtendedStation[]>([]);

    // --- HEAD OF DEPT DETAIL VIEW STATE ---
    const [adminViewMode, setAdminViewMode] = useState<'list' | 'detail'>('list');
    const [selectedAdminVehicle, setSelectedAdminVehicle] = useState<TrackedVehicle | null>(null);
    const [adminVehiclePassengers, setAdminVehiclePassengers] = useState<Passenger[]>([]);
    const [adminDetailTab, setAdminDetailTab] = useState<'manifest' | 'live' | 'report'>('manifest');

    // --- MAPBOX STATE ---
    const mapContainer = useRef(null);
    const map = useRef<any>(null); // Use any for the map instance to avoid strict typing issues with the global
    const markersRef = useRef<{ [key: string]: any }>({});

    // Force re-render state
    const [, forceUpdate] = useState(0);

    const refreshData = async () => {
        try {
            // Optimized Fetching
            const isCoord = isCoordinatorView && currentUser;
            const fetchedVehicles = await VehicleStore.getVehicles(isCoord ? currentUser.name : undefined);

            if (isCoord) {
                // For coordinators, we trust the filtered fetch (assuming server-side filter works or we filter again to be safe)
                const mine = fetchedVehicles.find(v => v.coordinator?.trim().toLowerCase() === currentUser.name.trim().toLowerCase());

                if (mine) {
                    let updated = mine;
                    // Initialize defaults if missing (Optimistic update pattern)
                    if (!mine.currentStage || !mine.journeyDirection) {
                        updated = {
                            ...mine,
                            currentStage: mine.currentStage || 'Onboarding',
                            journeyDirection: mine.journeyDirection || 'Ongoing',
                            approvals: mine.approvals || { registration: 'Pending', finance: 'Pending' }
                        };
                        VehicleStore.updateVehicle(updated); // Sync back default state
                    }

                    setMyVehicle(updated);
                    if (updated.journeyDirection) setActiveJourneyTab(updated.journeyDirection);

                    // Optimized Passenger Fetch
                    const myPassengers = await VehicleStore.getPassengers(mine.id);
                    setPassengers(myPassengers);
                } else {
                    setMyVehicle(null);
                    setPassengers([]);
                }
            } else {
                // Head of Dept View Data Logic
                const stations = await LogisticsStore.getStations();
                setDbStations(stations);

                const relevantStationIds = stations.filter(s => s.eventId === selectedEventId).map(s => s.id);

                // FILTER vehicles by relevant stations (which serve the selected event)
                let eventVehicles = fetchedVehicles.filter(v => relevantStationIds.includes(v.stationId));

                // FALLBACK: Also include vehicles assigned to Coordinators of this event (for vehicles not yet linked to stations)
                const eventCoordinators = await UserStore.getAll().then(all => all.filter(u => u.role === 'Coordinator' && u.eventId === selectedEventId).map(u => u.name));
                const coordinatorVehicles = fetchedVehicles.filter(v => v.coordinator && eventCoordinators.includes(v.coordinator));

                // Merge unique
                const vehicleIds = new Set(eventVehicles.map(v => v.id));
                coordinatorVehicles.forEach(v => {
                    if (!vehicleIds.has(v.id)) eventVehicles.push(v);
                });

                const simulatedVehicles: TrackedVehicle[] = eventVehicles.map((v) => {
                    const stages: JourneyStage[] = ['Onboarding', 'Verifying', 'RegApproval', 'FinanceApproval', 'Transit', 'Arrived'];
                    const stage = v.currentStage || 'Onboarding';
                    const idx = stages.indexOf(stage);
                    const calculatedProgress = idx === -1 ? 0 : Math.round(((idx + 1) / stages.length) * 100);

                    return {
                        ...v,
                        status: (v.status || 'Pending') as TrackedVehicle['status'],
                        progress: calculatedProgress,
                        eta: `${Math.floor(Math.random() * 20) + 5} mins`,
                        isDelayed: Math.random() > 0.8,
                        location: v.location,
                        currentStage: stage,
                        journeyDirection: v.journeyDirection || 'Ongoing',
                        coordinates: {
                            x: 20 + Math.random() * 60,
                            y: 20 + Math.random() * 60
                        }
                    };
                });
                setVehicles(simulatedVehicles);
            }

            refreshCoordinators();
        } catch (e) {
            console.error("Error refreshing data:", e);
        }
    };

    // Use ref to hold latest refreshData to avoid stale closures in subscriptions
    const refreshDataRef = useRef(refreshData);
    refreshDataRef.current = refreshData;

    useEffect(() => {
        refreshDataRef.current().catch(e => console.error("Refresh data error:", e));

        const interval = setInterval(() => {
            refreshDataRef.current().catch(e => console.error("Refresh interval error:", e));
        }, 10000);

        // Realtime Subscriptions
        const channel = supabase
            .channel('transport-dashboard-live')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'vehicles' },
                (payload) => {

                    refreshDataRef.current();
                    forceUpdate(n => n + 1);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'users' },
                (payload) => {

                    refreshCoordinators();
                    forceUpdate(n => n + 1);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'passengers' },
                (payload) => {

                    refreshDataRef.current();
                    forceUpdate(n => n + 1);
                }
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, []); // Empty dependency array as we use refs for latest data

    // Trigger refresh when event changes
    useEffect(() => {
        refreshData();
    }, [selectedEventId]);

    // Geolocation tracking for coordinator
    useEffect(() => {
        if (isCoordinatorView && myVehicle) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const now = Date.now();
                    // Update local UI immediately if needed, but throttle DB updates to every 10s
                    if (now - lastLocationUpdate.current > 10000) {
                        lastLocationUpdate.current = now;
                        VehicleStore.updateVehicleLocation(myVehicle.id, { lat: latitude, lng: longitude }).catch(err => {
                            console.error("Failed to update vehicle location:", err);
                        });
                    }
                },
                (error) => {
                    console.error("Error getting geolocation:", error.message);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );

            return () => {
                navigator.geolocation.clearWatch(watchId);
            };
        }
    }, [isCoordinatorView, myVehicle]);

    // Mapbox initialization
    // Google Maps Loader
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: 'AIzaSyCZSpPjUuv2sILESSb2yqYNxhzr9CfCtzs'
    });

    const [mapInstance, setMapInstance] = React.useState(null);

    const onLoad = React.useCallback(function callback(map: any) {
        setMapInstance(map);
    }, []);

    const onUnmount = React.useCallback(function callback(map: any) {
        setMapInstance(null);
    }, []);


    // Update Map Markers




    const refreshCoordinators = async () => {
        try {
            const users = await UserStore.getAll();
            const coords = users.filter(u =>
                u.role === 'Coordinator' &&
                u.departmentId === 'd5' &&
                u.eventId === selectedEventId
            );
            setCoordinators(coords);
            if (coords.length > 0 && !selectedCoordinator) setSelectedCoordinator(coords[0].name);
        } catch (e) {
            console.error("Error refreshing coordinators", e);
        }
    };

    const handleStageUpdate = (newStage: JourneyStage) => {
        if (!myVehicle) return;
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let updated = { ...myVehicle, currentStage: newStage };

        // Capture Timestamps (Capture if not already set by Finance)
        if (newStage === 'Transit') {
            if (activeJourneyTab === 'Ongoing' && !updated.ongoingStartTime) updated.ongoingStartTime = now;
            else if (activeJourneyTab === 'Return' && !updated.returnStartTime) updated.returnStartTime = now;
        }

        if (newStage === 'Arrived') {
            if (activeJourneyTab === 'Ongoing') {
                updated.ongoingArrivalTime = now;
                // Update DB and state before switching
                VehicleStore.updateVehicle(updated);
                setMyVehicle(updated);
                // Auto switch to return journey using the updated object
                setTimeout(() => {
                    switchJourneyTab('Return', updated);
                }, 500);
                return; // Prevent double update below
            } else {
                updated.returnArrivalTime = now;
                updated.status = 'Completed';
                updated.currentStage = 'Completed';
            }
        }

        if (newStage === 'RegApproval') updated.approvals = { ...updated.approvals, registration: 'Pending', finance: 'Pending' };
        if (newStage === 'FinanceApproval') updated.approvals = { ...updated.approvals!, registration: 'Approved', finance: 'Pending' };
        if (newStage === 'Transit') updated.approvals = { ...updated.approvals!, finance: 'Approved', registration: 'Approved' };

        VehicleStore.updateVehicle(updated);
        setMyVehicle(updated);
    };

    const isReturnAvailable = !!myVehicle?.ongoingArrivalTime;
    const isJourneyComplete = !!myVehicle?.returnArrivalTime;

    const handlePrintReport = () => {
        window.print();
    };

    const handleToggleVerify = (passengerId: string) => {
        const p = passengers.find(p => p.id === passengerId);
        if (p) {
            const updated = { ...p, verified: !p.verified };
            VehicleStore.updatePassenger(updated);
            setPassengers(passengers.map(pas => pas.id === passengerId ? updated : pas));
        }
    };

    const handleAddReturnPassenger = (e: React.FormEvent) => {
        e.preventDefault();
        if (!myVehicle || !returnPassengerForm.name.trim()) return;
        const newP: Passenger = {
            id: `p-new-${Date.now()}`,
            vehicleId: myVehicle.id,
            name: returnPassengerForm.name,
            contact: returnPassengerForm.contact,
            residence: returnPassengerForm.residence,
            category: 'Member',
            isFirstTime: 'No',
            verified: true
        };
        VehicleStore.addPassenger(newP);
        setPassengers([...passengers, newP]);
        setReturnPassengerForm({ name: '', contact: '', residence: '' });
    };

    const switchJourneyTab = (tab: 'Ongoing' | 'Return', vehicleOverride?: Vehicle) => {
        const vehicleToUpdate = vehicleOverride || myVehicle;
        if (!vehicleToUpdate) return;

        setActiveJourneyTab(tab);
        const updated: Vehicle = {
            ...vehicleToUpdate,
            journeyDirection: tab,
            currentStage: 'Onboarding' as JourneyStage,
            approvals: { registration: 'Pending', finance: 'Pending' }
        };
        VehicleStore.updateVehicle(updated);
        setMyVehicle(updated);
        if (tab === 'Return') {
            const resetPassengers = passengers.map(p => ({ ...p, verified: false }));
            resetPassengers.forEach(p => VehicleStore.updatePassenger(p));
            setPassengers(resetPassengers);
        }
    };



    const handleMarkSoulWon = async (passengerId: string) => {
        const p = passengers.find(p => p.id === passengerId);
        if (!p || !myVehicle) return;

        const newSoulWonStatus = !p.soulWon;
        const updatedPassenger = { ...p, soulWon: newSoulWonStatus };

        // Update local and DB
        setPassengers(passengers.map(pas => pas.id === passengerId ? updatedPassenger : pas));
        await VehicleStore.updatePassenger(updatedPassenger);

        if (newSoulWonStatus) {
            // Add to Souls Store
            // Helper to split name
            const nameParts = p.name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || 'Unknown';

            const newSoul: Soul = {
                id: `s-${Date.now()}`,
                firstName,
                lastName,
                phone: p.contact,
                gender: p.gender || 'Male', // Fallback
                residence: p.residence,
                status: 'New',
                sourceType: 'Event',
                sourceId: selectedEventId,
                capturedBy: currentUser?.name || 'Vehicle Coordinator',
                createdAt: new Date().toISOString()
            };

            try {
                await SoulsStore.add(newSoul);
                // Ideally show toast

            } catch (error) {
                console.error("Failed to add soul", error);
            }
        }
    };

    const handleAssignCoordinator = async (vehicleId: string) => {
        if (!selectedCoordinator) return;
        const allVehicles = await VehicleStore.getVehicles();
        const targetVehicle = allVehicles.find(v => v.id === vehicleId);
        if (targetVehicle) {
            const updated = { ...targetVehicle, coordinator: selectedCoordinator };
            VehicleStore.updateVehicle(updated);
            setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, coordinator: selectedCoordinator } : v));
            setIsAssigning(null);
            refreshData();
        }
    };




    const handleAddCoordinator = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCoordinator.name || !newCoordinator.username || !newCoordinator.password) return;
        const newUser: User = {
            id: `u-coord-${Date.now()}`,
            name: newCoordinator.name.trim(),
            role: 'Coordinator',
            username: newCoordinator.username,
            password: newCoordinator.password,
            departmentId: 'd5',
            eventId: selectedEventId,
            contact: newCoordinator.contact
        };
        try {
            UserStore.add(newUser);
            setNewCoordinator({ name: '', username: '', password: '', contact: '' });
            refreshCoordinators();
            alert(`Coordinator ${newUser.name} created successfully.`);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleDeleteCoordinator = (id: string) => {
        if (confirm('Are you sure you want to delete this coordinator?')) {
            UserStore.remove(id);
            refreshCoordinators();
        }
    };

    const handleOpenAdminVehicle = async (vehicle: TrackedVehicle) => {
        setSelectedAdminVehicle(vehicle);
        const allPassengers = await VehicleStore.getPassengers();
        setAdminVehiclePassengers(allPassengers.filter(p => p.vehicleId === vehicle.id));
        setAdminViewMode('detail');
        if (vehicle.status === 'Completed') {
            setAdminDetailTab('report');
        } else {
            setAdminDetailTab('manifest');
        }
    };

    const handleBackToFleet = () => {
        setAdminViewMode('list');
        setSelectedAdminVehicle(null);
        setAdminVehiclePassengers([]);
    };

    const handleRemovePassenger = async (passengerId: string) => {
        if (confirm('Are you sure you want to remove this passenger from the vehicle?')) {
            await VehicleStore.deletePassenger(passengerId);
            setPassengers(prev => prev.filter(p => p.id !== passengerId));
        }
    };

    // --- SHARED RENDER: JOURNEY REPORT ---
    const renderJourneyReport = (v: Vehicle, pax: Passenger[]) => {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 mb-8 animate-in zoom-in-50">
                <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-black text-ministry-text uppercase">Journey Report</h1>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                {v.status === 'Completed' ? 'Completed' : 'Active'}
                            </span>
                        </div>
                        <p className="text-gray-500 font-mono">ID: {v.id.toUpperCase()}</p>
                    </div>
                    <button onClick={handlePrintReport} className="noprint flex items-center bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black font-bold">
                        <Printer className="w-4 h-4 mr-2" /> Print Report
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase border-b border-gray-100 pb-2">Vehicle Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><span className="text-xs text-gray-400">Plate</span><p className="font-bold text-lg">{v.number_plate}</p></div>
                            <div><span className="text-xs text-gray-400">Type</span><p className="font-bold">{v.type}</p></div>
                            <div className="col-span-2"><span className="text-xs text-gray-400">Driver</span><p className="font-bold">{v.driverName}</p><p className="text-xs">{v.driverContact}</p></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase border-b border-gray-100 pb-2">Passenger Stats</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><span className="text-xs text-gray-400">Total Pax</span><p className="font-bold text-2xl text-ministry-orange">{pax.length}</p></div>
                            <div><span className="text-xs text-gray-400">First Timers</span><p className="font-bold text-xl">{pax.filter(p => p.isFirstTime === 'Yes').length}</p></div>
                            <div><span className="text-xs text-gray-400">Students</span><p className="font-bold">{pax.filter(p => p.category === 'Student').length}</p></div>
                            <div><span className="text-xs text-gray-400">Children</span><p className="font-bold text-purple-600">{v.childrenCount || 0}</p></div>
                            <div><span className="text-xs text-gray-400">Institutions</span><p className="font-bold">{pax.filter(p => p.category === 'Institution').length}</p></div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Journey Timing</h3>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold text-ministry-text mb-2 text-sm uppercase">Ongoing Leg</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b border-gray-200 border-dashed pb-1"><span>Set Off:</span> <span className="font-mono font-bold">{v.ongoingStartTime || '--:--'}</span></div>
                                <div className="flex justify-between border-b border-gray-200 border-dashed pb-1"><span>Arrival:</span> <span className="font-mono font-bold">{v.ongoingArrivalTime || '--:--'}</span></div>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-ministry-text mb-2 text-sm uppercase">Return Leg</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b border-gray-200 border-dashed pb-1"><span>Set Off:</span> <span className="font-mono font-bold">{v.returnStartTime || '--:--'}</span></div>
                                <div className="flex justify-between border-b border-gray-200 border-dashed pb-1"><span>Arrival:</span> <span className="font-mono font-bold">{v.returnArrivalTime || '--:--'}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center bg-gray-900 text-white p-6 rounded-xl">
                    <div>
                        <p className="text-xs text-gray-400 uppercase">Total Trip Cost</p>
                        <p className="text-2xl font-mono font-bold">UGX {Number(Number(v.financeDetails?.ongoingBalance || 0) + Number(v.financeDetails?.returnDispatch || 0)).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Authorized By</p>
                        <p className="font-bold">{v.coordinator}</p>
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDER: COORDINATOR VIEW ---
    if (isCoordinatorView) {
        if (!myVehicle) {
            return (
                <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-in fade-in">
                    <div className="bg-gray-100 p-6 rounded-full mb-4"><Bus className="w-12 h-12 text-gray-400" /></div>
                    <h2 className="text-2xl font-bold text-ministry-text">No Vehicle Assigned</h2>
                    <p className="text-gray-500 mt-2 max-w-md">You have not been assigned a vehicle for the current operation yet. Please contact the Transportation Head of Dept.</p>
                    <button onClick={() => refreshData()} className="mt-6 flex items-center text-ministry-orange hover:underline font-bold">
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh Status
                    </button>
                </div>
            );
        }

        if (!isVehicleOpen) {
            return (
                <div className="p-8 animate-in fade-in">
                    <h1 className="text-3xl font-bold text-ministry-text mb-8">My Assignment</h1>
                    <div className="bg-ministry-card border border-gray-200 rounded-2xl shadow-lg overflow-hidden max-w-2xl">
                        <div className="bg-ministry-text p-6 flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <Bus className="w-8 h-8 text-ministry-orange" />
                                <h2 className="text-2xl font-mono font-bold text-white tracking-wider">{myVehicle.number_plate}</h2>
                            </div>
                            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">{myVehicle.type}</span>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Driver</p>
                                    <p className="font-bold text-lg text-gray-800">{myVehicle.driverName}</p>
                                    <p className="text-sm text-gray-500">{myVehicle.driverContact}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Status</p>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${myVehicle.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {myVehicle.status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsVehicleOpen(true)}
                                className="w-full py-4 bg-ministry-orange text-white rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-transform active:scale-95 flex items-center justify-center"
                            >
                                Open Vehicle Dashboard <ChevronRight className="w-5 h-5 ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // FULL COORDINATOR DASHBOARD VIEW
        const stages = activeJourneyTab === 'Ongoing'
            ? ['Onboarding', 'Verifying', 'RegApproval', 'FinanceApproval', 'Transit', 'Arrived']
            : ['Onboarding', 'FinanceApproval', 'Transit', 'Arrived', 'Completed'];

        const currentStageIndex = stages.indexOf(myVehicle.currentStage || 'Onboarding');

        return (
            <div className="p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <button onClick={() => setIsVehicleOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight className="w-6 h-6 rotate-180" /></button>
                        <h1 className="text-2xl font-bold font-mono text-ministry-text">{myVehicle.number_plate}</h1>
                    </div>
                    <div className="flex bg-white border border-gray-200 rounded-lg p-1 noprint">
                        <button
                            disabled={!!myVehicle.ongoingArrivalTime}
                            onClick={() => switchJourneyTab('Ongoing')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeJourneyTab === 'Ongoing' ? 'bg-black text-ministry-neon shadow-md' : 'text-gray-400'} ${!!myVehicle.ongoingArrivalTime ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Ongoing Leg
                        </button>
                        {(isReturnAvailable || !!myVehicle.ongoingArrivalTime) && (
                            <button
                                disabled={myVehicle.status === 'Completed'}
                                onClick={() => switchJourneyTab('Return')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeJourneyTab === 'Return' ? 'bg-black text-ministry-neon shadow-md' : 'text-gray-400'} ${myVehicle.status === 'Completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Return Leg
                            </button>
                        )}
                    </div>
                </div>

                {/* JOURNEY SUMMARY REPORT (When Return Arrived) */}
                {isJourneyComplete && renderJourneyReport(myVehicle, passengers)}

                {/* Hide normal dashboard if complete */}
                {!isJourneyComplete && (
                    <>

                        {/* Progress Bar */}
                        <div className="mb-8 overflow-x-auto pb-4">
                            <div className="flex items-center justify-between min-w-[600px] relative">
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
                                <div className="absolute top-1/2 left-0 h-1 bg-ministry-orange -z-10 rounded-full transition-all duration-500" style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}></div>

                                {stages.map((stage, idx) => {
                                    const isActive = idx === currentStageIndex;
                                    const isCompleted = idx < currentStageIndex;

                                    let label = stage;
                                    if (stage === 'RegApproval') label = 'Reg. Verify';
                                    if (stage === 'FinanceApproval') label = 'Finance';

                                    return (
                                        <div key={stage} className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 bg-white ${isActive ? 'border-ministry-neon bg-black text-ministry-neon scale-110' :
                                                isCompleted ? 'border-ministry-orange bg-ministry-orange text-white' :
                                                    'border-gray-200 text-gray-300'
                                                }`}>
                                                {isCompleted ? <Check className="w-5 h-5" /> : (idx + 1)}
                                            </div>
                                            <span className={`mt-2 text-xs font-bold ${isActive ? 'text-ministry-text' : 'text-gray-400'}`}>{label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* STAGE CONTENT */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                            {/* --- MAP WIDGET (Always visible if in Transit OR Arrived) --- */}
                            {(myVehicle.currentStage === 'Transit' || myVehicle.currentStage === 'Arrived') ? (
                                <div className="relative h-[500px] bg-gray-100 w-full flex flex-col">
                                    {/* Coordinator Live Map */}
                                    {/* Coordinator Live Map */}
                                    {isLoaded ? (
                                        <GoogleMap
                                            mapContainerStyle={mapContainerStyle}
                                            center={{
                                                lat: myVehicle.location?.lat || 0.3476,
                                                lng: myVehicle.location?.lng || 32.5825
                                            }}
                                            zoom={14}
                                            onLoad={onLoad}
                                            onUnmount={onUnmount}
                                            options={{ mapTypeId: 'roadmap' }}
                                        >
                                            {myVehicle.location && (
                                                <Marker
                                                    position={{ lat: myVehicle.location.lat, lng: myVehicle.location.lng }}
                                                    title={myVehicle.number_plate}
                                                    icon={{
                                                        url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                                                        labelOrigin: (window as any).google ? new (window as any).google.maps.Point(16, -20) : undefined
                                                    }}
                                                    label={{
                                                        text: myVehicle.number_plate,
                                                        color: "white",
                                                        fontWeight: "bold",
                                                        fontSize: "12px",
                                                        className: "bg-orange-500 px-2 py-1 rounded shadow-md font-bold"
                                                    }}
                                                />
                                            )}
                                        </GoogleMap>
                                    ) : <div className="w-full h-full flex items-center justify-center bg-gray-100">Loading Map...</div>}

                                    <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10 text-center">
                                        <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-md">
                                            {myVehicle.currentStage === 'Arrived' ? 'Vehicle Arrived' : 'Vehicle is In Transit'}
                                        </h2>
                                        <p className="text-gray-200 text-sm drop-shadow-md">
                                            {myVehicle.currentStage === 'Arrived' ? `Arrival Time: ${activeJourneyTab === 'Ongoing' ? myVehicle.ongoingArrivalTime : myVehicle.returnArrivalTime}` : 'Locating...'}
                                        </p>
                                    </div>

                                    <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
                                        {myVehicle.currentStage === 'Transit' && (
                                            <button
                                                onClick={() => handleStageUpdate('Arrived')}
                                                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold text-lg shadow-xl flex items-center transform hover:scale-105 transition-all"
                                            >
                                                <MapPin className="w-5 h-5 mr-2" />
                                                Confirm Arrival
                                            </button>
                                        )}

                                        {myVehicle.currentStage === 'Arrived' && activeJourneyTab === 'Ongoing' && (
                                            <div className="bg-white/90 backdrop-blur px-6 py-4 rounded-xl shadow-xl text-center">
                                                <p className="font-bold text-gray-800 mb-2">Arrival Confirmed</p>
                                                <p className="text-sm text-gray-500">Wait for return instructions or switch to Return tab.</p>
                                            </div>
                                        )}

                                        {myVehicle.currentStage === 'Arrived' && activeJourneyTab === 'Return' && !myVehicle.returnArrivalTime && (
                                            <button
                                                onClick={() => handleStageUpdate('Onboarding')}
                                                className="bg-black text-ministry-neon px-8 py-3 rounded-full font-bold text-lg shadow-xl flex items-center transform hover:scale-105 transition-all"
                                            >
                                                <ChevronRight className="w-5 h-5 mr-2" />
                                                Start Return Journey
                                            </button>
                                        )}
                                    </div>
                                </div>

                            ) : (
                                <div className="p-6">
                                    {/* Stage: Onboarding or Verifying */}
                                    {(myVehicle.currentStage === 'Onboarding' || myVehicle.currentStage === 'Verifying') && (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-xl font-bold text-gray-800">
                                                    {myVehicle.currentStage === 'Onboarding' ? 'Onboarding Passengers' : 'Verify Manifest'}
                                                </h3>
                                                <div className="text-sm font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                                                    {passengers.filter(p => p.verified).length} / {passengers.length} Verified
                                                </div>
                                            </div>

                                            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                                                {passengers.length === 0 && (
                                                    <div className="py-10 text-center text-gray-400">
                                                        No passengers assigned to this vehicle yet.
                                                    </div>
                                                )}
                                                {passengers.map(p => (
                                                    <div key={p.id} className="py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg cursor-pointer" onClick={() => handleToggleVerify(p.id)}>
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${p.verified ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                                                {p.verified && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div>
                                                                <p className={`font-medium ${p.verified ? 'text-gray-900' : 'text-gray-500'}`}>{p.name}</p>
                                                                <p className="text-xs text-gray-400">{p.category}</p>
                                                            </div>
                                                        </div>
                                                        {activeJourneyTab === 'Return' && (myVehicle.currentStage === 'Verifying' || myVehicle.currentStage === 'Onboarding') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkSoulWon(p.id);
                                                                }}
                                                                className={`p-2 rounded-lg transition-colors ${p.soulWon ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
                                                                title={p.soulWon ? "Unmark Soul Won" : "Mark as Soul Won"}
                                                            >
                                                                <Heart className={`w-5 h-5 ${p.soulWon ? 'fill-current' : ''}`} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {activeJourneyTab === 'Return' && (
                                                <form onSubmit={handleAddReturnPassenger} className="pt-4 border-t border-gray-100 bg-gray-50 p-4 rounded-xl">
                                                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center"><UserPlus className="w-4 h-4 mr-2" /> Add Return Passenger</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <input
                                                            value={returnPassengerForm.name}
                                                            onChange={e => setReturnPassengerForm({ ...returnPassengerForm, name: e.target.value })}
                                                            placeholder="Name"
                                                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ministry-orange"
                                                        />
                                                        <div className="w-full">
                                                            <PhoneInput
                                                                value={returnPassengerForm.contact}
                                                                onChange={(val) => setReturnPassengerForm({ ...returnPassengerForm, contact: val })}
                                                                placeholder="Contact"
                                                                className="h-[38px]"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <input
                                                                value={returnPassengerForm.residence}
                                                                onChange={e => setReturnPassengerForm({ ...returnPassengerForm, residence: e.target.value })}
                                                                placeholder="Residence"
                                                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ministry-orange"
                                                            />
                                                            <button type="submit" className="bg-gray-900 text-white p-2 rounded-lg hover:bg-black"><Plus className="w-5 h-5" /></button>
                                                        </div>
                                                    </div>
                                                </form>
                                            )}

                                            <div className="pt-4 flex justify-end">
                                                {myVehicle.currentStage === 'Onboarding' ? (
                                                    <button
                                                        onClick={() => handleStageUpdate('Verifying')}
                                                        className="bg-ministry-text text-white px-6 py-3 rounded-xl font-bold flex items-center hover:bg-gray-800 transition-all"
                                                    >
                                                        <ThumbsUp className="w-4 h-4 mr-2" />
                                                        Approve Onboarding
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            const unverifiedCount = passengers.filter(p => !p.verified).length;
                                                            if (activeJourneyTab === 'Return' && unverifiedCount > 0) {
                                                                const verifiedCount = passengers.length - unverifiedCount;
                                                                if (window.confirm(`You have confirmed ${verifiedCount}/${passengers.length} members. Are you sure you want to continue?`)) {
                                                                    handleStageUpdate('FinanceApproval');
                                                                }
                                                            } else {
                                                                handleStageUpdate(activeJourneyTab === 'Ongoing' ? 'RegApproval' : 'FinanceApproval');
                                                            }
                                                        }}
                                                        className={`bg-ministry-orange text-white px-6 py-3 rounded-xl font-bold flex items-center hover:bg-orange-600 shadow-lg transition-all ${activeJourneyTab === 'Ongoing' && passengers.some(p => !p.verified) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        disabled={activeJourneyTab === 'Ongoing' && passengers.some(p => !p.verified)}
                                                    >
                                                        <ShieldAlert className="w-4 h-4 mr-2" />
                                                        Approve Verification
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Stage: Approvals */}
                                    {(myVehicle.currentStage === 'RegApproval' || myVehicle.currentStage === 'FinanceApproval') && (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                                {myVehicle.currentStage === 'RegApproval' ? <FileCheck className="w-10 h-10 text-orange-500" /> : <DollarSign className="w-10 h-10 text-green-600" />}
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                                {myVehicle.currentStage === 'RegApproval' ? 'Awaiting Registration Verification' : 'Awaiting Finance Approval'}
                                            </h3>
                                            <p className="text-gray-500 max-w-sm mb-6">
                                                The central team is reviewing your vehicle manifest. Please wait for approval to proceed.
                                            </p>
                                            <button
                                                onClick={() => refreshData()}
                                                className="flex items-center text-ministry-orange hover:underline font-bold"
                                            >
                                                <RefreshCw className="w-4 h-4 mr-2" /> Refresh Status
                                            </button>

                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // --- HEAD OF DEPT VIEW (Standard Admin) ---
    const activeVehicles = vehicles.filter(v => filterStatus === 'All' ? true : v.status === filterStatus);
    const filteredEvents = events.filter(e => e.type === 'Event');

    // Stats
    const totalVehicles = vehicles.length;
    const inTransit = vehicles.filter(v => v.progress > 0 && v.progress < 100).length;
    const delayed = vehicles.filter(v => v.isDelayed).length;

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Bus className="w-6 h-6 text-ministry-orange" />
                        <h1 className="text-2xl md:text-3xl font-bold text-ministry-text">Transportation Command</h1>
                    </div>
                    <p className="text-gray-500">Real-time fleet tracking and coordinator dispatch.</p>
                </div>

                <div className="flex items-center gap-4">
                    {activeTab === 'overview' && adminViewMode === 'list' && (
                        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                            <label className="block text-xs font-bold text-gray-400 uppercase">Active Operation</label>
                            <select
                                value={selectedEventId}
                                onChange={(e) => setSelectedEventId(e.target.value)}
                                className="font-bold text-ministry-text outline-none bg-transparent w-full cursor-pointer"
                            >
                                {filteredEvents.map(e => (
                                    <option key={e.id} value={e.id}>{e.title}{isEventLocked(e.date) ? ' (Locked)' : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {activeTab === 'overview' && selectedEvent && isEventLocked(selectedEvent.date) && (
                        <button
                            onClick={() => setShowHighlights(true)}
                            className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-all flex items-center shadow-lg"
                        >
                            <Activity className="w-4 h-4 mr-2 text-ministry-neon" />
                            View Highlights
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            {adminViewMode === 'list' && (
                <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'overview'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <Navigation className={`w-4 h-4 ${activeTab === 'overview' ? 'text-ministry-neon' : ''}`} />
                        <span>Fleet Overview</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('coordinators')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'coordinators'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <Users className={`w-4 h-4 ${activeTab === 'coordinators' ? 'text-ministry-neon' : ''}`} />
                        <span>Vehicle Coordinators</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('assets')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'assets'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <Package className={`w-4 h-4 ${activeTab === 'assets' ? 'text-ministry-neon' : ''}`} />
                        <span>Assets</span>
                    </button>
                </div>
            )}

            {/* === OVERVIEW TAB === */}
            {activeTab === 'overview' && (
                <>
                    {/* HEAD OF DEPT DETAIL VIEW */}
                    {adminViewMode === 'detail' && selectedAdminVehicle ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            <button onClick={handleBackToFleet} className="mb-4 flex items-center text-gray-500 hover:text-ministry-orange font-bold text-sm">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Fleet
                            </button>

                            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                                {/* Detail Header */}
                                <div className="bg-ministry-text p-6 flex justify-between items-center text-white">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-white/10 rounded-full"><Bus className="w-8 h-8 text-ministry-orange" /></div>
                                        <div>
                                            <h2 className="text-2xl font-mono font-bold">{selectedAdminVehicle.number_plate}</h2>
                                            <p className="text-white/60 text-sm">{selectedAdminVehicle.type}</p>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-full font-bold text-sm ${selectedAdminVehicle.status === 'Arrived' ? 'bg-green-500 text-white' : 'bg-ministry-neon text-black'}`}>
                                        {selectedAdminVehicle.status || 'Pending'}
                                    </div>
                                </div>

                                <div className="p-6">
                                    {/* Info Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Driver</p>
                                            <p className="font-bold text-gray-800 text-lg">{selectedAdminVehicle.driverName}</p>
                                            <div className="flex items-center text-sm text-gray-500 mt-1">
                                                <Phone className="w-3 h-3 mr-1" /> {selectedAdminVehicle.driverContact}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Coordinator</p>
                                            <p className="font-bold text-gray-800 text-lg">{selectedAdminVehicle.coordinator}</p>
                                            <div className="flex items-center text-sm text-gray-500 mt-1">
                                                <Users className="w-3 h-3 mr-1" /> Assigned
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Total Pax</p>
                                                <p className="font-bold text-ministry-orange text-3xl">{adminVehiclePassengers.length}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">First Timers: <span className="font-bold text-gray-800">{adminVehiclePassengers.filter(p => p.isFirstTime === 'Yes').length}</span></p>
                                                <p className="text-xs text-gray-500">Students: <span className="font-bold text-gray-800">{adminVehiclePassengers.filter(p => p.category === 'Student').length}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => setAdminDetailTab('manifest')}
                                                className={`flex-1 p-3 rounded-xl font-bold transition-all border ${adminDetailTab === 'manifest' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                Manifest
                                            </button>
                                            <button
                                                onClick={() => setAdminDetailTab('live')}
                                                className={`flex-1 p-3 rounded-xl font-bold transition-all border ${adminDetailTab === 'live' ? 'bg-ministry-orange text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                Live
                                            </button>
                                            <button
                                                onClick={() => setAdminDetailTab('report')}
                                                className={`flex-1 p-3 rounded-xl font-bold transition-all border ${adminDetailTab === 'report' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                Report
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    {adminDetailTab === 'manifest' && (
                                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                                    <tr>
                                                        <th className="px-6 py-4">Name</th>
                                                        <th className="px-6 py-4">Category</th>
                                                        <th className="px-6 py-4">Contact</th>
                                                        <th className="px-6 py-4">Residence</th>
                                                        <th className="px-6 py-4">Verified</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {adminVehiclePassengers.length === 0 ? (
                                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">No passengers registered.</td></tr>
                                                    ) : (
                                                        adminVehiclePassengers.map(p => (
                                                            <tr key={p.id} className="hover:bg-gray-50">
                                                                <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                                                                <td className="px-6 py-4 text-sm">{p.category}</td>
                                                                <td className="px-6 py-4 text-sm text-gray-600">{p.contact}</td>
                                                                <td className="px-6 py-4 text-sm text-gray-600">{p.residence}</td>
                                                                <td className="px-6 py-4">
                                                                    {p.verified ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {adminDetailTab === 'live' && (
                                        /* READ ONLY LIVE STATUS */
                                        <div className="bg-gray-100 rounded-xl p-4 h-[500px] flex flex-col relative overflow-hidden">
                                            {/* Status Overlay */}
                                            <div className="absolute top-4 right-4 z-10 bg-black/80 text-white px-4 py-2 rounded-lg backdrop-blur-md">
                                                <p className="text-xs text-gray-400 uppercase font-bold">Current Stage</p>
                                                <p className="font-bold text-ministry-neon">{selectedAdminVehicle.currentStage || 'Unknown'}</p>
                                            </div>

                                            {/* Map Container for Detail View */}
                                            {/* Map Container for Detail View */}
                                            {isLoaded ? (
                                                <GoogleMap
                                                    mapContainerStyle={mapContainerStyle}
                                                    center={{
                                                        lat: selectedAdminVehicle.location?.lat || 0.3476,
                                                        lng: selectedAdminVehicle.location?.lng || 32.5825
                                                    }}
                                                    zoom={15}
                                                    onLoad={onLoad}
                                                    onUnmount={onUnmount}
                                                    options={{ mapTypeId: 'roadmap' }}
                                                >
                                                    {selectedAdminVehicle.location && (
                                                        <Marker
                                                            position={{ lat: selectedAdminVehicle.location.lat, lng: selectedAdminVehicle.location.lng }}
                                                            label={{
                                                                text: selectedAdminVehicle.number_plate,
                                                                color: "white",
                                                                fontWeight: "bold",
                                                                fontSize: "14px",
                                                                className: "bg-orange-500 px-2 py-1 rounded shadow-md"
                                                            }}
                                                            icon={{
                                                                url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                                                                labelOrigin: (window as any).google ? new (window as any).google.maps.Point(16, -20) : undefined
                                                            }}
                                                        />
                                                    )}
                                                </GoogleMap>
                                            ) : <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">Loading Map View...</div>}
                                        </div>
                                    )}

                                    {adminDetailTab === 'report' && (
                                        <div className="p-4 bg-gray-50 rounded-xl">
                                            {renderJourneyReport(selectedAdminVehicle, adminVehiclePassengers)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* STANDARD FLEET LIST */
                        <>
                            {/* KPI Stats Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-ministry-card border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Total Fleet</p>
                                        <h3 className="text-2xl font-bold text-ministry-text">{totalVehicles}</h3>
                                    </div>
                                    <div className="p-2 bg-gray-100 rounded-lg"><Bus className="w-5 h-5 text-gray-600" /></div>
                                </div>
                                <div className="bg-ministry-card border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">In Transit</p>
                                        <h3 className="text-2xl font-bold text-ministry-text">{inTransit}</h3>
                                    </div>
                                    <div className="p-2 bg-blue-100 rounded-lg"><Navigation className="w-5 h-5 text-blue-600" /></div>
                                </div>
                                <div className="bg-ministry-card border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Alerts</p>
                                        <h3 className="text-2xl font-bold text-ministry-orange">{delayed}</h3>
                                    </div>
                                    <div className="p-2 bg-orange-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-ministry-orange" /></div>
                                </div>
                                <div className="bg-ministry-card border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Arrived</p>
                                        <h3 className="text-2xl font-bold text-green-600">{vehicles.filter(v => v.progress === 100).length}</h3>
                                    </div>
                                    <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                                </div>
                            </div>

                            {/* Main Grid: Map & List */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                                {/* Left Column: Live Map */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="border border-gray-200 rounded-2xl p-1 shadow-sm overflow-hidden relative h-[500px] bg-gray-900">


                                        {/* Mapbox Container */}
                                        {/* Google Map Container */}
                                        {isLoaded ? (
                                            <GoogleMap
                                                mapContainerStyle={mapContainerStyle}
                                                center={center}
                                                zoom={11}
                                                onLoad={onLoad}
                                                onUnmount={onUnmount}
                                                options={{ mapTypeId: 'roadmap' }}
                                            >
                                                {activeVehicles.map(v => (
                                                    v.location && (
                                                        <Marker
                                                            key={v.id}
                                                            position={{ lat: v.location.lat, lng: v.location.lng }}
                                                            label={{
                                                                text: `${v.coordinator || 'Unassigned'}`,
                                                                color: "white",
                                                                fontWeight: "bold",
                                                                fontSize: "12px",
                                                                className: "bg-orange-500 px-2 py-1 rounded shadow-md"
                                                            }}
                                                            // Custom SVG Icon (Car Shape)
                                                            icon={{
                                                                url: v.isDelayed ? "http://maps.google.com/mapfiles/ms/icons/orange-dot.png" : "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                                                                labelOrigin: (window as any).google ? new (window as any).google.maps.Point(16, -20) : undefined
                                                            }}
                                                            title={`${v.number_plate} - ${v.coordinator}`}
                                                        />
                                                    )
                                                ))}
                                            </GoogleMap>
                                        ) : <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">Loading Live View...</div>}


                                    </div>
                                </div>

                                {/* Right Column: Fleet List */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-lg text-ministry-text">Fleet Operations</h3>
                                        <div className="flex bg-gray-100 rounded-lg p-1">
                                            <button onClick={() => setFilterStatus('All')} className={`px-2 py-1 text-[10px] font-bold rounded ${filterStatus === 'All' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>All</button>
                                            <button onClick={() => setFilterStatus('En Route')} className={`px-2 py-1 text-[10px] font-bold rounded ${filterStatus === 'En Route' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Moving</button>
                                            <button onClick={() => setFilterStatus('Arrived')} className={`px-2 py-1 text-[10px] font-bold rounded ${filterStatus === 'Arrived' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Arrived</button>
                                            <button onClick={() => setFilterStatus('Completed')} className={`px-2 py-1 text-[10px] font-bold rounded ${filterStatus === 'Completed' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Done</button>
                                        </div>
                                    </div>

                                    <div className="bg-ministry-card border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
                                        {/* Search */}
                                        <div className="p-4 border-b border-gray-100">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ministry-orange" placeholder="Search plate or driver..." />
                                            </div>
                                        </div>

                                        {/* List */}
                                        <div className="flex-1 overflow-y-auto">
                                            {activeVehicles.length === 0 ? (
                                                <div className="p-8 text-center text-gray-400">
                                                    {totalVehicles === 0
                                                        ? "No vehicles assigned to this operation."
                                                        : "No vehicles match the filter."
                                                    }
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-gray-100">
                                                    {activeVehicles.map(v => (
                                                        <div key={v.id} className="p-4 hover:bg-gray-50 transition-colors">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <span className="font-mono font-bold text-gray-900">{v.number_plate}</span>
                                                                        {v.isDelayed && <ShieldAlert className="w-4 h-4 text-ministry-orange" />}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">{v.type} • {v.driverName}</p>
                                                                    <div className="flex items-center mt-1">
                                                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${v.journeyDirection === 'Return'
                                                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                                                            }`}>
                                                                            {v.journeyDirection || 'Ongoing'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v.status === 'Completed' ? 'bg-green-600 text-white' :
                                                                        v.currentStage === 'Arrived' ? 'bg-green-100 text-green-700' :
                                                                            v.currentStage === 'Transit' ? 'bg-blue-100 text-blue-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                        {v.status === 'Completed' ? 'Completed' : (v.currentStage || 'Pending')}
                                                                    </span>
                                                                    {v.currentStage !== 'Arrived' && <p className="text-xs text-gray-400 mt-1">ETA: {v.eta}</p>}
                                                                </div>
                                                            </div>

                                                            {/* Progress Bar */}
                                                            <div className="w-full bg-gray-100 h-1.5 rounded-full mb-3 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-1000 ${v.isDelayed ? 'bg-ministry-orange' : 'bg-ministry-neon'}`}
                                                                    style={{ width: `${v.progress}%` }}
                                                                ></div>
                                                            </div>
                                                            {/* Actions */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center text-xs text-gray-500">
                                                                    <span className="font-bold mr-1">Coord:</span>
                                                                    {isAssigning === v.id ? (
                                                                        <div className="flex items-center space-x-1">
                                                                            <select
                                                                                autoFocus
                                                                                className="bg-white border border-gray-300 rounded px-1 py-0.5 max-w-[120px]"
                                                                                value={selectedCoordinator}
                                                                                onChange={(e) => setSelectedCoordinator(e.target.value)}
                                                                            >
                                                                                {coordinators.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                                                {coordinators.length === 0 && <option value="">No Coords</option>}
                                                                            </select>
                                                                            <button onClick={() => handleAssignCoordinator(v.id)} className="bg-green-100 text-green-700 p-1 rounded hover:bg-green-200"><CheckCircle className="w-3 h-3" /></button>
                                                                        </div>
                                                                    ) : (
                                                                        <span className={!v.coordinator ? 'text-red-400 italic' : ''}>
                                                                            {v.coordinator || 'Unassigned'}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {!v.coordinator && !isAssigning && !isEventLocked(selectedEvent?.date || '') && (
                                                                    <button
                                                                        onClick={() => setIsAssigning(v.id)}
                                                                        className="text-xs font-bold text-ministry-orange hover:text-orange-700 flex items-center"
                                                                    >
                                                                        <UserPlus className="w-3 h-3 mr-1" /> Assign
                                                                    </button>
                                                                )}
                                                                {v.coordinator && (
                                                                    <button
                                                                        onClick={() => handleOpenAdminVehicle(v)}
                                                                        className="text-xs font-bold text-gray-500 hover:text-ministry-text flex items-center bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                                                                    >
                                                                        Details <ChevronRight className="w-3 h-3 ml-1" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* === COORDINATORS TAB === */}
            {activeTab === 'coordinators' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* List */}
                    <div className="bg-ministry-card border border-gray-200 rounded-2xl shadow-sm p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center">
                                <IdCard className="w-5 h-5 mr-2 text-ministry-orange" />
                                Coordinators
                            </h2>
                            <span className="text-xs bg-ministry-neon text-black px-2 py-1 rounded font-bold">
                                {selectedEvent?.title}
                            </span>
                        </div>

                        <div className="overflow-hidden">
                            {coordinators.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    No coordinators found for this operation. Add one to get started.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {coordinators.map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
                                                    {c.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{c.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">@{c.username}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleDeleteCoordinator(c.id)}
                                                    disabled={isEventLocked(selectedEvent?.date || '')}
                                                    className={`p-2 rounded-lg transition-colors ${isEventLocked(selectedEvent?.date || '') ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                                    title="Delete Coordinator"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add Form */}
                    {!isEventLocked(selectedEvent?.date || '') && (
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 h-fit">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <UserPlus className="w-5 h-5 mr-2 text-ministry-orange" />
                                Add Coordinator
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">Create credentials for vehicle coordinators for <strong>{selectedEvent?.title}</strong> to an active operation. These users will be available in the dropdown when assigning vehicles.</p>

                            <form onSubmit={handleAddCoordinator} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Full Name</label>
                                    <input
                                        required
                                        value={newCoordinator.name}
                                        onChange={e => setNewCoordinator({ ...newCoordinator, name: e.target.value })}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"
                                        placeholder="e.g. Mike Ross"
                                    />

                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Contact</label>
                                    <div className="relative">
                                        <PhoneInput
                                            required
                                            value={newCoordinator.contact}
                                            onChange={(val) => setNewCoordinator({ ...newCoordinator, contact: val })}
                                            placeholder="700 000 000"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Username</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            required
                                            value={newCoordinator.username}
                                            onChange={e => setNewCoordinator({ ...newCoordinator, username: e.target.value })}
                                            className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"
                                            placeholder="username"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Password</label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            required
                                            type="password"
                                            value={newCoordinator.password}
                                            onChange={e => setNewCoordinator({ ...newCoordinator, password: e.target.value })}
                                            className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"
                                            placeholder="••••••"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button type="submit" className="w-full bg-ministry-text text-white py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg">
                                        Create Coordinator
                                    </button>
                                </div>
                            </form >
                        </div >
                    )}


                    {
                        isEventLocked(selectedEvent?.date || '') && (
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center h-full">
                                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                                    <ShieldAlert className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Event Locked</h3>
                                <p className="text-gray-500 mt-2 max-w-xs">This event has been concluded and locked. Coordinators cannot be added or modified.</p>
                                <button onClick={() => setShowHighlights(true)} className="mt-6 text-ministry-orange font-bold hover:underline">View Highlights</button>
                            </div>
                        )
                    }
                </div >
            )}

            {/* === ASSETS TAB === */}
            {activeTab === 'assets' && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-1">
                    <AssetsTab
                        currentUser={currentUser || { id: 'viewer', name: 'Viewer', role: 'Viewer' } as User}
                        departmentId={isCoordinatorView ? 'd5' : undefined}
                    />
                </div>
            )}

            <EventDetailsModal
                event={showHighlights ? selectedEvent || null : null}
                onClose={() => setShowHighlights(false)}
            />
        </div >
    );
};

export default TransportationDashboard;
