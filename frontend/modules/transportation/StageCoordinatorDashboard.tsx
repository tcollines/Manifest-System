
import React, { useState, useEffect } from 'react';
import { User, ModalType, Passenger } from '../../types';
import { UserStore } from '../../database/userStore';
import { VehicleStore, mapVehicleFromDB } from '../../database/vehicleStore';
import { LogisticsStore, ExtendedStation } from '../../database/logisticsStore';
import { EventStore } from '../../database/eventStore';
import { supabase } from '../../services/supabaseClient';
import { useNotification } from '../../components/ui/NotificationSystem';
import {
    MapPin,
    Users,
    Bus,
    AlertTriangle,
    UserPlus,
    Phone,
    Activity,
    RefreshCw
} from 'lucide-react';
import PhoneInput from '../../components/PhoneInput';
import { useAuth } from '@/context/AuthContext';
import { TrackedVehicle } from './types';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';

const mapContainerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '1rem'
};

const center = {
    lat: 0.3476,
    lng: 32.5825
};

const StageCoordinatorDashboard: React.FC = () => {
    const { user: currentUser } = useAuth();
    const { showToast } = useNotification();
    const [station, setStation] = useState<ExtendedStation | null>(null);
    const [vehicles, setVehicles] = useState<TrackedVehicle[]>([]);
    const [staff, setStaff] = useState<User[]>([]);
    const [passengerCounts, setPassengerCounts] = useState<Record<string, number>>({});
    const [allCoordinators, setAllCoordinators] = useState<User[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'vehicles' | 'map'>('overview');
    const [eventLocation, setEventLocation] = useState<{lat: number, lng: number} | null>(null);

    // Forms
    const [newUser, setNewUser] = useState({ firstName: '', lastName: '', username: '', password: '', contact: '', role: 'Vehicle Coordinator' });
    const [isAddingStaff, setIsAddingStaff] = useState(false);

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

    useEffect(() => {
        loadStationData();
    }, [currentUser.stationId]);

    const loadStationData = async () => {
        if (!currentUser.stationId) return;

        try {
            // 1. Get My Station Details (Server-scoped)
            const stationRes = await LogisticsStore.getStations();
            const stations = stationRes.status === 'success' ? stationRes.data : [];
            const myStation = stations.find(s => s.id === currentUser.stationId);
            setStation(myStation || null);

            if (!myStation) return;

            // 1.5 Get Event Details to find the destination
            let destLoc = { lat: 0.3278, lng: 32.5936 }; // Fallback destination
            if (myStation.eventId) {
                const eventRes = await EventStore.getAll();
                const events = eventRes.status === 'success' ? eventRes.data : [];
                const thisEvent = events.find(e => e.id === myStation.eventId);
                if (thisEvent && thisEvent.lat && thisEvent.lng) {
                    destLoc = { lat: thisEvent.lat, lng: thisEvent.lng };
                    setEventLocation(destLoc);
                } else {
                    setEventLocation(destLoc);
                }
            }

            // 2. Get Vehicles for this event/station (Server-scoped)
            const vehicleRes = await VehicleStore.getVehicles({ eventId: myStation.eventId });
            const allEventVehicles = vehicleRes.status === 'success' ? vehicleRes.data : [];
            const myVehicles = allEventVehicles.filter(v => v.stationId === currentUser.stationId);

            // Simulate locations for vehicles
            const trackedVehicles: TrackedVehicle[] = myVehicles.map(v => {
                const lat = v.location?.lat || (0.3476 + (Math.random() - 0.5) * 0.02);
                const lng = v.location?.lng || (32.5825 + (Math.random() - 0.5) * 0.02);
                return { ...v, location: { lat, lng } } as TrackedVehicle;
            });
            setVehicles(trackedVehicles);

            // 3. Get Staff for this event (Server-scoped)
            // We fetch ALL users and filter locally because:
            // a) Data Entrants might only have a stationId, but no eventId
            // b) Vehicle Coordinators might have an eventId, but no stationId
            const userRes = await UserStore.getAll();
            const allUsers = userRes.status === 'success' ? userRes.data : [];

            // A staff member is shown if:
            // 1. They are officially assigned to this station (excluding current user)
            // 2. OR they are a Vehicle Coordinator assigned to a vehicle that is currently at this station
            const stationStaff = allUsers.filter(u => {
                if (u.id === currentUser.id) return false;
                if (u.stationId === currentUser.stationId) return true;

                // If they are a vehicle coordinator, check if any vehicle at this station belongs to them
                if (u.role === 'Vehicle Coordinator') {
                    return myVehicles.some(v => v.coordinatorUid === u.id || v.coordinator === u.name);
                }
                return false;
            });

            setStaff(stationStaff);
            setAllCoordinators(allUsers.filter(u =>
                u.role === 'Vehicle Coordinator' ||
                u.role === 'Stage Coordinator' ||
                u.role === 'Coordinator'
            ));

            // 4. Get Passengers counts for this event
            const countRes = await VehicleStore.getPassengerCounts(myStation.eventId);
            if (countRes.status === 'success') {
                setPassengerCounts(countRes.data);
            }

        } catch (error) {
            console.error("Error loading stage data:", error);
            showToast("Failed to load dashboard data", "error");
        }
    };

    // Vehicle Simulation Effect
    useEffect(() => {
        if (!eventLocation) return;
        
        const interval = setInterval(() => {
            setVehicles(prevVehicles => prevVehicles.map(v => {
                // Determine if vehicle should be moving
                const isMoving = v.status === 'En Route' || v.currentStage === 'Transit';
                if (!isMoving) return v;
                
                if (!v.location) return v;
                
                const targetLat = eventLocation.lat;
                const targetLng = eventLocation.lng;
                
                const dLat = targetLat - v.location.lat;
                const dLng = targetLng - v.location.lng;
                
                const dist = Math.sqrt(dLat * dLat + dLng * dLng);
                if (dist < 0.0001) {
                    // Close enough to destination
                    return { ...v, status: 'Arrived', currentStage: 'Arrived' } as any;
                }
                
                // Simulation step (speed)
                const step = 0.0002; 
                const moveRatio = Math.min(step / dist, 1);
                
                return {
                    ...v,
                    location: {
                        lat: v.location.lat + dLat * moveRatio,
                        lng: v.location.lng + dLng * moveRatio
                    }
                };
            }));
        }, 100);
        
        return () => clearInterval(interval);
    }, [eventLocation]);

    // Realtime Subscriptions
    useEffect(() => {
        const channel = supabase
            .channel('stage-dashboard-live')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'passengers' },
                (payload) => {
                    const { eventType } = payload;
                    const newRecord = payload.new as any;
                    const oldRecord = payload.old as any;

                    if (eventType === 'INSERT') {
                        const vehicleId = newRecord?.vehicle_id;
                        if (vehicleId) {
                            setPassengerCounts(prev => ({
                                ...prev,
                                [vehicleId]: (prev[vehicleId] || 0) + 1
                            }));
                        }
                    } else if (eventType === 'DELETE') {
                        const vehicleId = oldRecord?.vehicle_id;
                        if (vehicleId) {
                            setPassengerCounts(prev => ({
                                ...prev,
                                [vehicleId]: Math.max(0, (prev[vehicleId] || 0) - 1)
                            }));
                        }
                    } else if (eventType === 'UPDATE') {
                        const newVid = newRecord?.vehicle_id;
                        const oldVid = oldRecord?.vehicle_id;
                        if (oldVid && newVid && oldVid !== newVid) {
                            setPassengerCounts(prev => {
                                const next = { ...prev };
                                next[oldVid] = Math.max(0, (next[oldVid] || 0) - 1);
                                next[newVid] = (next[newVid] || 0) + 1;
                                return next;
                            });
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'vehicles' },
                (payload) => {
                    const { eventType, new: newRecord } = payload;
                    if (eventType === 'UPDATE') {
                        const mapped = mapVehicleFromDB(newRecord);
                        setVehicles(prev => prev.map(v => v.id === mapped.id ? { ...v, ...mapped } as any : v));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getCoordinatorContact = (name: string) => {
        const coord = allCoordinators.find(u => u.name === name);
        return coord?.contact || 'N/A';
    };

    const getVehicleCapacity = (type: string) => {
        switch (type) {
            case 'Taxi': return 14;
            case 'Coaster': return 28;
            case 'Bus': return 60;
            case 'Car': return 5;
            default: return 0;
        }
    };

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.firstName || !newUser.lastName || !newUser.username || !newUser.password) {
            showToast("Please fill in all required fields", "error");
            return;
        }

        if (newUser.password.length < 6) {
            showToast("Password must be at least 6 characters long for security", "error");
            return;
        }

        try {
            const userToAdd: User = {
                id: crypto.randomUUID(),
                name: `${newUser.firstName.trim()} ${newUser.lastName.trim()}`,
                username: newUser.username,
                password: newUser.password,
                contact: newUser.contact,
                role: newUser.role as 'Vehicle Coordinator' | 'Stage Coordinator' | 'Coordinator' | 'Logistics',
                departmentId: '4630e48a-f97e-48fd-a901-864b591c282f', // Transportation default (UUID)
                stationId: currentUser.stationId, // Link to this stage
                eventId: station?.eventId || currentUser?.eventId, // Link to the operation
                email: '',
                status: 'Active'
            };

            if (newUser.role === 'Data Entrant') {
                userToAdd.role = 'Logistics';
                userToAdd.departmentId = '81b8b740-6663-4179-bcfb-e3dc7524d36c'; // Registration department UUID
            }

            await UserStore.add(userToAdd);
            showToast(`${newUser.role} added successfully`, "success");
            setNewUser({ firstName: '', lastName: '', username: '', password: '', contact: '', role: 'Vehicle Coordinator' });
            setIsAddingStaff(false);
            loadStationData();
        } catch (error) {
            showToast("Failed to add user", "error");
        }
    };

    if (!currentUser?.stationId) {
        return (
            <div className="p-8 text-center text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
                <h2 className="text-xl font-bold">No Station Assigned</h2>
                <p>You are logged in as a Stage Coordinator but have no station assigned.</p>
                <p className="text-sm mt-2">Please contact the Administrator.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 bg-gray-50 min-h-screen font-sans text-gray-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-5 h-5 text-ministry-orange" />
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Stage Dashboard</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900">{station?.name || 'Loading Station...'}</h1>
                    <p className="text-gray-500">{station?.location || 'Unknown Location'}</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={loadStationData} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <RefreshCw className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="bg-ministry-orange/10 px-4 py-2 rounded-2xl border border-ministry-orange/20">
                        <p className="text-xs text-ministry-orange font-bold uppercase">Total Vehicles</p>
                        <p className="text-2xl font-black text-ministry-orange">{vehicles.length}</p>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                        <p className="text-xs text-blue-600 font-bold uppercase">Passenger Count</p>
                        <p className="text-2xl font-black text-blue-600">
                            {vehicles.reduce((sum, v) => sum + (passengerCounts[v.id] || 0), 0)}
                        </p>
                    </div>
                    <div className="bg-purple-50 px-4 py-2 rounded-2xl border border-purple-100">
                        <p className="text-xs text-purple-600 font-bold uppercase">Total Children</p>
                        <p className="text-2xl font-black text-purple-600">
                            {vehicles.reduce((sum, v) => sum + (v.childrenCount || 0), 0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'overview' ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('map')}
                    className={`pb-3 px-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'map' ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Live Map
                </button>
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`pb-3 px-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'staff' ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Staff Management
                </button>
                <button
                    onClick={() => setActiveTab('vehicles')}
                    className={`pb-3 px-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'vehicles' ? 'border-ministry-orange text-ministry-orange' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Vehicles
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Quick Status Cards */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-end mb-4">
                                <h3 className="font-bold text-gray-700 flex items-center mb-0">
                                    <Activity className="w-5 h-5 mr-2 text-green-500" />
                                    Operation Status
                                </h3>
                                <div className="flex items-center gap-4 text-xs pr-3">
                                    <span className="text-gray-400 font-bold text-[10px] uppercase min-w-[50px] text-center">Ongoing</span>
                                    <div className="w-px"></div>
                                    <span className="text-gray-400 font-bold text-[10px] uppercase min-w-[50px] text-center">Return</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <span className="text-sm text-gray-800 font-bold">Pending Vehicles</span>
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex flex-col items-center min-w-[50px]">
                                            {(() => {
                                                const count = vehicles.filter(v => (v.journeyDirection === 'Ongoing' || !v.journeyDirection) && (v.status === 'Pending' || ['Registration', 'RegApproval', 'FinanceApproval'].includes(v.currentStage))).length;
                                                return <span className={`font-bold text-sm ${count > 0 ? 'text-orange-600' : 'text-blue-600'}`}>{count}</span>;
                                            })()}
                                        </div>
                                        <div className="w-px h-6 bg-gray-200"></div>
                                        <div className="flex flex-col items-center min-w-[50px]">
                                            {(() => {
                                                const count = vehicles.filter(v => v.journeyDirection === 'Return' && (v.status === 'Pending' || ['Registration', 'RegApproval', 'FinanceApproval'].includes(v.currentStage))).length;
                                                return <span className={`font-bold text-sm ${count > 0 ? 'text-purple-600' : 'text-purple-600'}`}>{count}</span>;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <span className="text-sm text-gray-800 font-bold">En Route</span>
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex flex-col items-center min-w-[50px]">
                                            {(() => {
                                                const count = vehicles.filter(v => (v.journeyDirection === 'Ongoing' || !v.journeyDirection) && (v.status === 'En Route' || v.currentStage === 'Transit')).length;
                                                return <span className={`font-bold text-sm ${count > 0 ? 'text-blue-600' : 'text-blue-600'}`}>{count}</span>;
                                            })()}
                                        </div>
                                        <div className="w-px h-6 bg-gray-200"></div>
                                        <div className="flex flex-col items-center min-w-[50px]">
                                            {(() => {
                                                const count = vehicles.filter(v => v.journeyDirection === 'Return' && (v.status === 'En Route' || v.currentStage === 'Transit')).length;
                                                return <span className={`font-bold text-sm ${count > 0 ? 'text-blue-600' : 'text-blue-600'}`}>{count}</span>;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <span className="text-sm text-gray-800 font-bold">Arrived</span>
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex flex-col items-center min-w-[50px]">
                                            {(() => {
                                                const count = vehicles.filter(v => (v.journeyDirection === 'Ongoing' || !v.journeyDirection) && (v.status === 'Arrived' || ['Arrived', 'Completed'].includes(v.currentStage))).length;
                                                return <span className={`font-bold text-sm ${count > 0 ? 'text-green-600' : 'text-green-600'}`}>{count}</span>;
                                            })()}
                                        </div>
                                        <div className="w-px h-6 bg-gray-200"></div>
                                        <div className="flex flex-col items-center min-w-[50px]">
                                            {(() => {
                                                const count = vehicles.filter(v => v.journeyDirection === 'Return' && (v.status === 'Arrived' || ['Arrived', 'Completed'].includes(v.currentStage))).length;
                                                return <span className={`font-bold text-sm ${count > 0 ? 'text-green-600' : 'text-green-600'}`}>{count}</span>;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Fleet Summary */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-700 mb-4 flex items-center">
                                <Bus className="w-5 h-5 mr-2 text-purple-500" />
                                Vehicle Fleet
                            </h3>
                            <div className="space-y-4">
                                {['Taxi', 'Coaster', 'Bus', 'Car', 'Boda'].map(type => {
                                    const count = vehicles.filter(v => v.type === type).length;
                                    if (count === 0) return null;
                                    return (
                                        <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                            <span className="text-sm text-gray-600">{type}s</span>
                                            <span className="font-bold text-gray-800">{count}</span>
                                        </div>
                                    );
                                })}
                                {vehicles.length === 0 && <p className="text-sm text-gray-400 italic">No vehicles found.</p>}
                            </div>
                        </div>

                        {/* Recent Staff */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-700 mb-4 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-blue-500" />
                                My Team
                            </h3>
                            <div className="space-y-3">
                                {staff.slice(0, 5).map(member => (
                                    <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{member.name}</p>
                                            <p className="text-xs text-gray-500">{member.role === 'Logistics' ? 'Data Entrant' : 'Vehicle Coord'}</p>
                                        </div>
                                    </div>
                                ))}
                                {staff.length === 0 && <p className="text-sm text-gray-400 italic">No staff assigned yet.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'map' && (
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Live Vehicle Map</h2>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center text-xs font-bold text-gray-500"><div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div> Arrived</span>
                                <span className="flex items-center text-xs font-bold text-gray-500"><div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div> En Route</span>
                            </div>
                        </div>
                        {isLoaded ? (
                            <GoogleMap
                                mapContainerStyle={mapContainerStyle}
                                center={center}
                                zoom={12}
                                onLoad={onLoad}
                                onUnmount={onUnmount}
                                options={{ mapTypeId: 'roadmap' }}
                            >
                                {/* Station Marker */}
                                <Marker
                                    position={center} // Should be station location if we had coords
                                    label="S"
                                    title="My Station"
                                />

                                {/* Event Destination Marker */}
                                {eventLocation && (
                                    <Marker
                                        position={eventLocation}
                                        title="Event Destination"
                                        icon={{
                                            url: "http://maps.google.com/mapfiles/ms/icons/purple-dot.png"
                                        }}
                                    />
                                )}

                                {/* Route Line */}
                                {eventLocation && (
                                    <Polyline
                                        path={[center, eventLocation]}
                                        options={{
                                            strokeColor: '#000000',
                                            strokeOpacity: 0.8,
                                            strokeWeight: 4,
                                        }}
                                    />
                                )}

                                {/* Vehicle Markers */}
                                {vehicles.map(v => (
                                    v.location && (
                                        <Marker
                                            key={v.id}
                                            position={{ lat: v.location.lat, lng: v.location.lng }}
                                            title={`${v.number_plate} (${v.driverName})`}
                                            label={{
                                                text: `${v.coordinator || 'Unassigned'}`,
                                                color: "black",
                                                fontWeight: "bold",
                                                fontSize: "12px",
                                                className: "bg-white px-2 py-1 rounded shadow-md mt-8"
                                            }}
                                            icon={{
                                                url: '/Pin.png',
                                                scaledSize: (window as any).google ? new (window as any).google.maps.Size(40, 40) : undefined,
                                                labelOrigin: (window as any).google ? new (window as any).google.maps.Point(20, 50) : undefined
                                            }}
                                        />
                                    )
                                ))}
                            </GoogleMap>
                        ) : (
                            <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
                                <p className="text-gray-500">Loading Map...</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'staff' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Staff Directory</h2>
                            <button
                                onClick={() => setIsAddingStaff(!isAddingStaff)}
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add Staff
                            </button>
                        </div>

                        {isAddingStaff && (
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg animate-in fade-in slide-in-from-top-4">
                                <h3 className="font-bold text-lg mb-4">New Staff Member</h3>
                                <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600">Role</label>
                                        <select
                                            value={newUser.role}
                                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-ministry-orange"
                                        >
                                            <option value="Vehicle Coordinator">Vehicle Coordinator</option>
                                            <option value="Data Entrant">Data Entrant</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600">First Name</label>
                                        <input
                                            required
                                            value={newUser.firstName}
                                            onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-ministry-orange"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600">Last Name</label>
                                        <input
                                            required
                                            value={newUser.lastName}
                                            onChange={e => setNewUser({ ...newUser, lastName: e.target.value })}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-ministry-orange"
                                            placeholder="Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600">Username</label>
                                        <input
                                            required
                                            value={newUser.username}
                                            onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-ministry-orange"
                                            placeholder="johndoe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600">Password</label>
                                        <input
                                            required
                                            type="text"
                                            value={newUser.password}
                                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-ministry-orange"
                                            placeholder="secret123"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-gray-600">Contact</label>
                                        <PhoneInput
                                            value={newUser.contact}
                                            onChange={val => setNewUser({ ...newUser, contact: val })}
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingStaff(false)}
                                            className="px-4 py-2 text-gray-500 hover:text-gray-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 bg-ministry-orange text-white rounded-xl hover:bg-orange-600 font-bold"
                                        >
                                            Create Account
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {staff.map(member => (
                                <div key={member.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow flex items-start justify-between group">
                                    <div className="flex gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${member.role === 'Logistics' ? 'bg-purple-500' : 'bg-orange-500'}`}>
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{member.name}</p>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                                                {member.role === 'Logistics' ? 'Data Entrant' : member.role}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono">{member.username}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${member.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {member.status || 'Active'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'vehicles' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Assigned Vehicles</h2>
                        </div>

                        {vehicles.length === 0 ? (
                            <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-300">
                                <Bus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No vehicles assigned to this stage yet.</p>
                                <p className="text-sm text-gray-400">Vehicles added in Registration will appear here.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {vehicles.map(vehicle => (
                                    <div key={vehicle.id} className="bg-white p-5 rounded-2xl border border-gray-200 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-ministry-orange/10 p-3 rounded-xl border border-ministry-orange/20">
                                                    <Bus className="w-6 h-6 text-ministry-orange" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-xl text-gray-900">{vehicle.number_plate}</h3>
                                                    <p className="text-sm font-bold text-gray-500">{vehicle.type}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${vehicle.currentStage === 'Arrived' || vehicle.currentStage === 'Completed' ? 'bg-green-100 text-green-700' :
                                                    vehicle.currentStage === 'Transit' || vehicle.status === 'En Route' ? 'bg-blue-100 text-blue-700' :
                                                        vehicle.currentStage === 'FinanceApproval' || vehicle.currentStage === 'RegApproval' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {vehicle.currentStage ? vehicle.currentStage.replace(/([A-Z])/g, ' $1').trim() : (vehicle.status || 'Pending')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="flex flex-col gap-4">
                                                <div className="bg-gray-50 p-3 rounded-xl">
                                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Onboarded</p>
                                                    <p className="text-2xl font-black text-gray-800">
                                                        {passengerCounts[vehicle.id] || 0}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-xl">
                                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Children</p>
                                                    <p className="text-lg font-bold text-gray-800">
                                                        {vehicle.childrenCount || 0}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-4">
                                                <div className="bg-gray-50 p-3 rounded-xl">
                                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Coordinator</p>
                                                    <p className="text-sm font-bold text-gray-800 truncate">{vehicle.coordinator}</p>
                                                    <p className="text-xs text-gray-500 flex items-center mt-1">
                                                        <Phone className="w-3 h-3 mr-1" />
                                                        {getCoordinatorContact(vehicle.coordinator)}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-xl flex-grow">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-xs text-gray-400 font-bold uppercase">Driver</p>
                                                        <p className="text-xs text-gray-500 font-mono">{vehicle.driverContact}</p>
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-800">{vehicle.driverName}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {vehicle.status === 'Pending' && (
                                            <button className="w-full mt-4 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
                                                Manage Dispatch
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StageCoordinatorDashboard;
