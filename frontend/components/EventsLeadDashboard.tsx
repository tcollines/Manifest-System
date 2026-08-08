import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { EventStore } from '../database/eventStore';
import { VehicleStore } from '../database/vehicleStore';
import { UserStore } from '../database/userStore';
import { LogisticsStore, ExtendedStation } from '../database/logisticsStore';
import { useNotification } from '../components/ui/NotificationSystem';
import { Passenger, Vehicle, User, MinistryEvent } from '../types';
import {
    Calendar, Users, Bus, Clock, Home, GraduationCap, Building,
    Award, Wallet, Baby, UserPlus, Download, UserCheck, Shield,
    MapPin, Settings, AlertCircle, BarChart3, Activity, Car
} from 'lucide-react';

const EventsLeadDashboard: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useNotification();
    const [activeTab, setActiveTab] = useState<'General' | 'Passengers' | 'Vehicles' | 'Ministers'>('General');
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const [eventDetails, setEventDetails] = useState<MinistryEvent | null>(null);
    const [highlights, setHighlights] = useState<any>(null);
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [stations, setStations] = useState<ExtendedStation[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const initData = async () => {
            let targetEventId = user?.eventId;

            if (!targetEventId) {
                // For Admins/TeamLeaders without a specific event assigned, find the next upcoming or current event
                try {
                    const eventsRes = await EventStore.getAll();
                    if (eventsRes.status === 'success' && eventsRes.data && eventsRes.data.length > 0) {
                        const currentDate = new Date().toISOString().split('T')[0];
                        const upcoming = eventsRes.data.filter((e: any) => e.date >= currentDate && e.type === 'Event').sort((a: any, b: any) => a.date.localeCompare(b.date));
                        if (upcoming.length > 0) {
                            targetEventId = upcoming[0].id;
                        }
                    }
                } catch (error) {
                    console.error("Error fetching fallback events", error);
                }
            }

            if (targetEventId) {
                loadData(targetEventId);
            } else {
                setLoading(false);
            }
        };

        initData();
    }, [user?.eventId]);

    const loadData = async (eventId: string) => {
        setLoading(true);
        try {
            const [
                highlightsRes,
                passengersRes,
                vehiclesRes,
                stationsRes,
                usersRes,
                eventsRes
            ] = await Promise.all([
                EventStore.getHighlights(eventId),
                VehicleStore.getPassengers({ eventId }),
                VehicleStore.getVehicles({ eventId }),
                LogisticsStore.getStations(eventId),
                UserStore.getAll({ eventId }),
                EventStore.getAll()
            ]);
            
            setHighlights(highlightsRes || null);
            if (passengersRes.status === 'success') setPassengers(passengersRes.data || []);
            if (vehiclesRes.status === 'success') setVehicles(vehiclesRes.data || []);
            if (stationsRes.status === 'success') setStations(stationsRes.data || []);
            if (usersRes.status === 'success') setUsers(usersRes.data || []);
            
            if (eventsRes.status === 'success') {
                const ev = eventsRes.data.find((e: any) => e.id === eventId);
                if (ev && ev.type === 'Event') {
                    setEventDetails(ev);
                } else {
                    setEventDetails(null);
                }
            }
        } catch (error) {
            console.error('Failed to load dashboard data', error);
            showToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (isoString: string | null) => {
        if (!isoString) return 'Pending / Evaluating...';
        try {
            const d = new Date(isoString);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return isoString;
        }
    };

    const exportPassengersToExcel = () => {
        if (!passengers || passengers.length === 0) {
            showToast('No passengers to export.', 'error');
            return;
        }
        setExporting(true);
        try {
            const data = passengers.map(p => {
                const vehicle = vehicles.find(v => v.id === p.vehicleId);
                const station = stations.find(s => s.id === p.stationId);
                return {
                    Name: p.name,
                    Contact: p.contact,
                    Category: p.category,
                    Residence: p.residence,
                    'First Time': p.isFirstTime,
                    'Soul Won': p.soulWon ? 'Yes' : 'No',
                    Verified: p.verified ? 'Yes' : 'No',
                    School: p.school || 'N/A',
                    'Student Class': p.studentClass || 'N/A',
                    'Boarding Type': p.boardingType || 'N/A',
                    Gender: p.gender || 'N/A',
                    'Parent Contact': p.parentContact || 'N/A',
                    Stage: station ? station.name : 'Unknown',
                    'Vehicle Number Plate': vehicle ? vehicle.number_plate : 'Unknown'
                };
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Passengers');
            
            const eventName = eventDetails?.title || 'Event';
            XLSX.writeFile(wb, `${eventName}_Passengers.xlsx`);
            showToast('Export successful!', 'success');
        } catch (error) {
            console.error('Export failed', error);
            showToast('Failed to export passenger data', 'error');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[500px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-ministry-orange"></div>
            </div>
        );
    }

    if (!eventDetails) {
        return (
            <div className="h-full w-full bg-gray-50 flex flex-col p-6 animate-in fade-in duration-300">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Live Event Dashboard</h1>
                    <p className="text-gray-500 mt-2">Welcome, {user?.name || user?.role || 'User'}.</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center max-w-2xl mx-auto mt-10">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Event</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        There is currently no active event open or assigned. Please check back later or contact an administrator.
                    </p>
                </div>
            </div>
        );
    }

    // Calculations for Passengers Tab
    const totalPassengers = passengers.length;
    const totalFirstTimers = passengers.filter(p => p.isFirstTime === 'Yes').length;
    const totalSoulsWon = passengers.filter(p => p.soulWon).length;
    const totalStudents = passengers.filter(p => p.category === 'Student').length;
    const totalCommunity = passengers.filter(p => p.category === 'Member').length; // Member/Community
    const totalInstitutions = passengers.filter(p => p.category === 'Institution').length;

    const passengerStatsPerStage = stations.map(station => {
        const stationVehicles = vehicles.filter(v => v.stationId === station.id);
        const stationVehicleIds = new Set(stationVehicles.map(v => v.id));
        const stationPassengers = passengers.filter(p => stationVehicleIds.has(p.vehicleId));

        return {
            stationName: station.name,
            passengerCount: stationPassengers.length,
            vehicleCount: stationVehicles.length
        };
    });

    // Calculations for Vehicles Tab (excluding Private Transport public link entries)
    const realFleetVehicles = vehicles.filter(v => 
        v.number_plate !== 'PUBLIC TRANSPORT' && 
        !v.number_plate?.toLowerCase().startsWith('private car') && 
        !stations.find(s => s.id === v.stationId)?.name.toLowerCase().includes('private transport')
    );
    const totalVehicles = realFleetVehicles.length;
    const vehiclesByCategory = realFleetVehicles.reduce((acc, v) => {
        const type = v.type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, { Car: 0, Taxi: 0, Coaster: 0, Bus: 0 } as Record<string, number>);
    const ongoingStats = {
        'Onboarding': 0,
        'Verifying': 0,
        'Revapproval': 0,
        'Finance approval': 0,
        'Transit': 0,
        'Arrived': 0
    };
    const returnStats = {
        'Pending': 0,
        'Verifying': 0,
        'Revapproval': 0,
        'Finance approval': 0,
        'Transit': 0,
        'Arrived': 0
    };

    realFleetVehicles.forEach(v => {
        const stage = v.currentStage || 'Onboarding';
        const direction = v.journeyDirection || 'Ongoing';

        let displayStage = '';
        if (stage === 'Onboarding') displayStage = direction === 'Return' ? 'Pending' : 'Onboarding';
        else if (stage === 'Verifying') displayStage = 'Verifying';
        else if (stage === 'RegApproval') displayStage = 'Revapproval';
        else if (stage === 'FinanceApproval') displayStage = 'Finance approval';
        else if (stage === 'Transit') displayStage = 'Transit';
        else if (stage === 'Arrived' || stage === 'Completed') displayStage = 'Arrived';
        else displayStage = stage;
        
        if (direction === 'Ongoing' && displayStage in ongoingStats) {
            ongoingStats[displayStage as keyof typeof ongoingStats]++;
        } else if (direction === 'Return' && displayStage in returnStats) {
            returnStats[displayStage as keyof typeof returnStats]++;
        }
    });

    // Calculations for Ministers Tab
    const vehicleCoordinatorsCount = vehicles.filter(v => v.coordinator).length; // or from users list
    const stageCoordinatorsCount = stations.filter(s => s.coordinatorName).length;
    const dataEntrantsCount = stations.filter(s => s.dataEntrantName).length;
    
    // Exact users from UserStore
    const userVehicleCoordinators = users.filter(u => u.role === 'Vehicle Coordinator').length;
    const userStageCoordinators = users.filter(u => u.role === 'Stage Coordinator').length;
    const userDataEntrants = users.filter(u => u.role === 'Logistics' || u.role === 'Coordinator').length;
    const currentDate = new Date().toISOString().split('T')[0];
    const isEventActive = eventDetails?.date && currentDate >= eventDetails.date;
    const otherUsers = isEventActive 
        ? users.filter(u => !['Vehicle Coordinator', 'Stage Coordinator'].includes(u.role)).length 
        : 0;
        
    const totalChildren = vehicles.reduce((acc, v) => acc + (v.childrenCount || 0), 0) + passengers.filter(p => p.category === 'Child').length;
    const totalBudget = vehicles.reduce((acc, v) => {
        if (!v.financeDetails) return acc;
        const totalCost = parseFloat(v.financeDetails.ongoingDispatch) || 0;
        return acc + totalCost;
    }, 0);

    const completedJourneys = vehicles.filter(v => v.ongoingStartTime && v.ongoingArrivalTime);
    let avgEta = "N/A";
    if (completedJourneys.length > 0) {
        const totalDurationMs = completedJourneys.reduce((acc, v) => {
            const start = new Date(v.ongoingStartTime!).getTime();
            const end = new Date(v.ongoingArrivalTime!).getTime();
            return acc + Math.max(0, end - start);
        }, 0);
        const avgMs = totalDurationMs / completedJourneys.length;
        const avgMinutes = Math.round(avgMs / 60000);
        if (avgMinutes < 60) {
            avgEta = `${avgMinutes} mins`;
        } else {
            avgEta = `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m`;
        }
    }


    return (
        <div className="h-full w-full bg-gray-50 flex flex-col p-4 md:p-6 lg:p-8 animate-in fade-in duration-300 overflow-y-auto">
            {/* Header */}
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                        {eventDetails?.title || 'Event Dashboard'}
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 mt-2 font-medium">Welcome back, {user?.name}. Here is what's happening at your event.</p>
                </div>
                <div className="grid grid-cols-4 md:flex bg-white shadow-sm border border-gray-100 rounded-xl p-1 w-full md:w-auto">
                    {(['General', 'Passengers', 'Vehicles', 'Ministers'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-1 py-2 md:px-6 md:py-2.5 rounded-lg text-[10px] sm:text-sm font-bold whitespace-nowrap transition-all duration-200 flex items-center justify-center ${
                                activeTab === tab 
                                    ? 'bg-gray-900 text-white shadow-md' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <span className="truncate">{tab}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 lg:p-8 min-h-[500px]">
                
                {/* 1. GENERAL TAB */}
                {activeTab === 'General' && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 mb-6">
                            <Activity className="text-blue-500 w-6 h-6" />
                            <h2 className="text-2xl font-bold text-gray-800">Event Highlights</h2>
                        </div>
                        {highlights ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <MetricCard icon={<Users />} title="Total Passengers" value={totalPassengers.toLocaleString()} subtitle="Overall passengers" color="orange" />
                                <MetricCard icon={<Bus />} title="Total Vehicles" value={totalVehicles.toLocaleString()} subtitle="All vehicles" color="indigo" />
                                <MetricCard icon={<Shield />} title="Ministers Served" value={users.length.toLocaleString()} subtitle="Serving ministers" color="amber" />
                                <MetricCard icon={<Wallet />} title="Total Budget" value={`UGX ${totalBudget.toLocaleString()}`} subtitle="Allocated budget" color="blue" />
                                
                                <MetricCard icon={<Clock />} title="Average ETA" value={avgEta} subtitle="Based on vehicle journeys" color="teal" />
                                <MetricCard icon={<Users />} title="Private Commuters" value={(highlights.personalCars || 0).toLocaleString()} subtitle="Passengers via Public Link" color="emerald" />
                                <MetricCard icon={<Baby />} title="Children" value={totalChildren.toLocaleString()} subtitle="Children attendees" color="purple" />
                                <MetricCard icon={<Home />} title="Community" value={(highlights.residentials || 0).toLocaleString()} subtitle="Residents / Locals" color="pink" />
                                
                                <MetricCard icon={<GraduationCap />} title="Students" value={(highlights.students || 0).toLocaleString()} subtitle="From Schools" color="violet" />
                                <MetricCard icon={<Building />} title="Institutions" value={(highlights.institutions || 0).toLocaleString()} subtitle="Organizations" color="cyan" />
                                <MetricCard icon={<UserPlus />} title="First Timers" value={(highlights.firstTimers || 0).toLocaleString()} subtitle="New attendees" color="blue" />
                                <MetricCard icon={<Award />} title="VIPs" value={highlights.vips || 0} subtitle="Special Guests" color="orange" />
                            </div>
                        ) : (
                            <p className="text-gray-500 py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">No highlights generated yet.</p>
                        )}
                    </div>
                )}

                {/* 2. PASSENGERS TAB */}
                {activeTab === 'Passengers' && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                            <div className="flex items-center gap-3">
                                <Users className="text-indigo-500 w-6 h-6" />
                                <h2 className="text-2xl font-bold text-gray-800">Passenger Analytics</h2>
                            </div>
                            <button
                                onClick={exportPassengersToExcel}
                                disabled={exporting}
                                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                            >
                                {exporting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Download size={18} />}
                                Export to Excel
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                            <StatBox label="Total Passengers" value={totalPassengers} />
                            <StatBox label="Total Stages" value={stations.length} />
                            <StatBox label="Total Students" value={totalStudents} />
                            <StatBox label="Community" value={totalCommunity} />
                            <StatBox label="First Timers" value={totalFirstTimers} highlight />
                            <StatBox label="Souls Won" value={totalSoulsWon} highlight />
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 p-4 border-b border-gray-100">
                                <h3 className="font-bold text-gray-700">Stages Breakdown</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                            <th className="p-4 font-bold">Stage / Station</th>
                                            <th className="p-4 font-bold text-right">Vehicles Attached</th>
                                            <th className="p-4 font-bold text-right">Passengers Boarded</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {passengerStatsPerStage.length > 0 ? passengerStatsPerStage.map((s, i) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-bold text-gray-800">{s.stationName}</td>
                                                <td className="p-4 font-medium text-gray-600 text-right">{s.vehicleCount}</td>
                                                <td className="p-4 font-black text-indigo-600 text-right">{s.passengerCount}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-gray-400">No stage data available</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. VEHICLES TAB */}
                {activeTab === 'Vehicles' && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 mb-8">
                            <Bus className="text-teal-500 w-6 h-6" />
                            <h2 className="text-2xl font-bold text-gray-800">Vehicle Logistics</h2>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <StatBox label="Total Vehicles" value={totalVehicles} highlight />
                            {Object.entries(vehiclesByCategory).map(([cat, count]) => (
                                <StatBox key={cat} label={cat + 's'} value={count} />
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 lg:col-span-2">
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><MapPin size={18}/> Status Breakdown</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-bold text-gray-500 mb-3 text-sm uppercase tracking-wider">Ongoing Journey</h4>
                                        <div className="space-y-3">
                                            {Object.entries(ongoingStats).map(([status, count]) => (
                                                <div key={status} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                    <span className="font-bold text-gray-600">{status}</span>
                                                    <span className="bg-teal-100 text-teal-800 font-bold px-3 py-1 rounded-full text-sm">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-gray-500 mb-3 text-sm uppercase tracking-wider">Return Journey</h4>
                                        <div className="space-y-3">
                                            {Object.entries(returnStats).map(([status, count]) => (
                                                <div key={status} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                    <span className="font-bold text-gray-600">{status}</span>
                                                    <span className="bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full text-sm">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col h-full">
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 shrink-0"><MapPin size={18}/> Vehicles Per Stage</h3>
                                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                                    {passengerStatsPerStage.length > 0 ? (
                                        passengerStatsPerStage.map((s, i) => (
                                            <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100">
                                                <span className="font-bold text-gray-600 truncate mr-2">{s.stationName}</span>
                                                <span className="bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full text-sm">{s.vehicleCount}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 text-sm">No stage data available.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Detailed Vehicle List */}
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 p-4 border-b border-gray-100">
                                <h3 className="font-bold text-gray-700">Detailed Vehicle List</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                            <th className="p-4 font-bold">Number Plate</th>
                                            <th className="p-4 font-bold">Driver Info</th>
                                            <th className="p-4 font-bold">Coordinator Info</th>
                                            <th className="p-4 font-bold">Stage</th>
                                            <th className="p-4 font-bold text-right">Passengers</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {vehicles.length > 0 ? vehicles.map((v, i) => (
                                            <tr key={v.id || i} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-bold text-gray-800">{v.number_plate}</td>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-800">{v.driverName}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{v.driverContact}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-800">{v.coordinator || 'N/A'}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{v.coordinatorContact || 'N/A'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md text-xs">
                                                        {v.currentStage || stations.find(s => s.id === v.stationId)?.name || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-black text-teal-600 text-right text-lg">
                                                    {v.passengerCount !== undefined ? v.passengerCount : passengers.filter(p => p.vehicleId === v.id).length}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-400">No vehicles registered yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. MINISTERS TAB */}
                {activeTab === 'Ministers' && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 mb-8">
                            <Shield className="text-rose-500 w-6 h-6" />
                            <h2 className="text-2xl font-bold text-gray-800">Serving Ministers & Staff</h2>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <StatBox label="Vehicle Coordinators" value={userVehicleCoordinators || vehicleCoordinatorsCount} />
                            <StatBox label="Stage Coordinators" value={userStageCoordinators || stageCoordinatorsCount} />
                            <StatBox label="Data Entrants" value={userDataEntrants || dataEntrantsCount} />
                            <StatBox label="Other System Users" value={otherUsers} />
                        </div>

                        <div className="bg-rose-50/50 p-8 rounded-3xl border border-rose-100 text-center mb-8">
                            <UserCheck className="w-12 h-12 text-rose-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-800">Staff Overview</h3>
                            <p className="text-gray-600 mt-2 max-w-lg mx-auto">
                                There are currently <strong className="text-rose-600">{users.length}</strong> active system users assigned or interacting with this event across all stages and vehicles.
                            </p>
                        </div>

                        {/* Detailed Staff List */}
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center gap-2">
                                <Users className="text-gray-500 w-5 h-5" />
                                <h3 className="font-bold text-gray-700">Detailed Staff List</h3>
                            </div>
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                        <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                            <th className="p-4 font-bold">Name</th>
                                            <th className="p-4 font-bold">Contact</th>
                                            <th className="p-4 font-bold">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {users.length > 0 ? users.map((u, i) => (
                                            <tr key={u.id || i} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-bold text-gray-800">{u.name || u.username}</td>
                                                <td className="p-4">
                                                    <div className="text-gray-800 font-medium">{u.contact || 'N/A'}</div>
                                                    {u.email && <div className="text-xs text-gray-500 mt-0.5">{u.email}</div>}
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full text-xs">
                                                        {(u.role === 'Logistics' || u.role === 'Coordinator') ? 'Data Entrant' : u.role || 'User'}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-gray-400">No serving ministers or staff found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

const MetricCard = ({ icon, title, value, subtitle, color }: { icon: any, title: string, value: string | number, subtitle: string, color: string }) => {
    const colors: Record<string, { bg: string, border: string, title: string, icon: string, subtitle: string }> = {
        orange: { bg: 'from-orange-50 to-orange-100/50', border: 'border-orange-100', title: 'text-orange-800', icon: 'bg-orange-500', subtitle: 'text-orange-600' },
        blue: { bg: 'from-blue-50 to-blue-100/50', border: 'border-blue-100', title: 'text-blue-800', icon: 'bg-blue-500', subtitle: 'text-blue-600' },
        indigo: { bg: 'from-indigo-50 to-indigo-100/50', border: 'border-indigo-100', title: 'text-indigo-800', icon: 'bg-indigo-500', subtitle: 'text-indigo-600' },
        emerald: { bg: 'from-emerald-50 to-emerald-100/50', border: 'border-emerald-100', title: 'text-emerald-800', icon: 'bg-emerald-500', subtitle: 'text-emerald-600' },
        purple: { bg: 'from-purple-50 to-purple-100/50', border: 'border-purple-100', title: 'text-purple-800', icon: 'bg-purple-500', subtitle: 'text-purple-600' },
        pink: { bg: 'from-pink-50 to-pink-100/50', border: 'border-pink-100', title: 'text-pink-800', icon: 'bg-pink-500', subtitle: 'text-pink-600' },
        violet: { bg: 'from-violet-50 to-violet-100/50', border: 'border-violet-100', title: 'text-violet-800', icon: 'bg-violet-500', subtitle: 'text-violet-600' },
        amber: { bg: 'from-amber-50 to-amber-100/50', border: 'border-amber-100', title: 'text-amber-800', icon: 'bg-amber-500', subtitle: 'text-amber-600' },
        teal: { bg: 'from-teal-50 to-teal-100/50', border: 'border-teal-100', title: 'text-teal-800', icon: 'bg-teal-500', subtitle: 'text-teal-600' },
        cyan: { bg: 'from-cyan-50 to-cyan-100/50', border: 'border-cyan-100', title: 'text-cyan-800', icon: 'bg-cyan-500', subtitle: 'text-cyan-600' },
    };
    
    const theme = colors[color] || colors.blue;

    return (
        <div className={`bg-gradient-to-br ${theme.bg} p-6 rounded-2xl border ${theme.border} shadow-sm hover:shadow-md transition-all group`}>
            <div className="flex items-center gap-3 mb-2">
                <div className={`${theme.icon} text-white p-2 rounded-lg group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <h3 className={`text-xs font-bold ${theme.title} uppercase tracking-wider`}>{title}</h3>
            </div>
            <p className="text-3xl font-black text-gray-900 mt-2 truncate">
                {value}
            </p>
            <p className={`text-xs ${theme.subtitle} mt-1 font-medium`}>{subtitle}</p>
        </div>
    );
};

const StatBox = ({ label, value, highlight = false }: { label: string, value: string | number, highlight?: boolean }) => (
    <div className={`p-5 rounded-2xl border transition-all ${highlight ? 'bg-indigo-50 border-indigo-100 hover:shadow-md' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}>
        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${highlight ? 'text-indigo-800' : 'text-gray-500'}`}>{label}</p>
        <p className={`text-3xl font-black ${highlight ? 'text-indigo-600' : 'text-gray-900'}`}>{value}</p>
    </div>
);

export default EventsLeadDashboard;
