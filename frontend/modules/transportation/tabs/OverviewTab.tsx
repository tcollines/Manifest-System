/**
 * OverviewTab
 *
 * Fleet Overview tab for the Transportation module.
 * Handles both:
 *   - Vehicle Coordinator view (single assigned vehicle dashboard)
 *   - Head of Dept view (full fleet list + live map + vehicle detail)
 *
 * All data and handlers come from TransportationLayout via useTransport().
 * No currentUser prop. No events prop.
 */

import React from 'react';
import { useTransport } from '../TransportContext';
import { DEFAULT_CENTER } from '../types';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { isEventLocked } from '../../../utils';
import { JourneyStage, Vehicle, Passenger } from '../../../types';
import PhoneInput from '../../../components/PhoneInput';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import {
    Bus, Navigation, AlertTriangle, CheckCircle, UserPlus, ChevronRight,
    Search, ShieldAlert, MapPin, FileCheck, DollarSign,
    Printer, Circle, Check, Plus, ThumbsUp, RefreshCw, ArrowLeft, Activity,
    Phone, Loader2, ExternalLink, Heart, Users, LocateFixed
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const mapContainerStyle = { width: '100%', height: '100%' };

// ─── Journey Report (shared between coordinator + admin detail) ───────────────

const JourneyReport: React.FC<{ vehicle: Vehicle; passengers: Passenger[]; onPrint: () => void }> = ({ vehicle: v, passengers: pax, onPrint }) => (
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
            <button onClick={onPrint} className="noprint flex items-center bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black font-bold">
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
                <div className="grid grid-cols-3 gap-4">
                    <div><span className="text-xs text-gray-400">Total Pax</span><p className="font-bold text-2xl text-ministry-orange">{pax.length}</p></div>
                    <div><span className="text-xs text-gray-400">First Timers</span><p className="font-bold text-xl">{pax.filter(p => p.isFirstTime === 'Yes').length}</p></div>
                    <div><span className="text-xs text-gray-400">Souls Won</span><p className="font-bold text-xl text-red-500">{pax.filter(p => p.soulWon).length}</p></div>
                    <div><span className="text-xs text-gray-400">Students</span><p className="font-bold">{pax.filter(p => p.category === 'Student').length}</p></div>
                    <div><span className="text-xs text-gray-400">Children</span><p className="font-bold text-purple-600">{v.childrenCount || 0}</p></div>
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

// ─── Coordinator View ─────────────────────────────────────────────────────────

const CoordinatorView: React.FC = () => {
    const { user } = useAuth();
    const {
        myVehicle, passengers, activeJourneyTab, isVehicleOpen, setIsVehicleOpen,
        returnPassengerForm, setReturnPassengerForm, submittingStage,
        handleStageUpdate, handleToggleVerify, handleAddReturnPassenger,
        handleMarkSoulWon, switchJourneyTab, handlePrintReport,
        isReturnAvailable, isJourneyComplete, refreshData, selectedEventId,
        cognitoFormUrl
    } = useTransport();
    const { showToast, confirm: askConfirm } = useNotification();

    const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: 'AIzaSyCZSpPjUuv2sILESSb2yqYNxhzr9CfCtzs' });
    const [mapInstance, setMapInstance] = React.useState(null);
    const onLoad = React.useCallback((map: any) => setMapInstance(map), []);
    const onUnmount = React.useCallback(() => setMapInstance(null), []);

    const [userLocation, setUserLocation] = React.useState<{ lat: number, lng: number } | null>(null);

    React.useEffect(() => {
        if (!navigator.geolocation) return;
        const watchId = navigator.geolocation.watchPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.error(err),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    if (!myVehicle) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-in fade-in">
                <div className="bg-gray-100 p-6 rounded-full mb-4"><Bus className="w-12 h-12 text-gray-400" /></div>
                <h2 className="text-2xl font-bold text-ministry-text">No Vehicle Assigned</h2>
                <p className="text-gray-500 mt-2 max-w-md">You have not been assigned a vehicle for this operation yet. Contact the Transportation Head of Dept.</p>
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

    const stages = activeJourneyTab === 'Ongoing'
        ? ['Onboarding', 'Verifying', 'RegApproval', 'FinanceApproval', 'Transit', 'Arrived']
        : ['Onboarding', 'FinanceApproval', 'Transit', 'Arrived', 'Completed'];
    const currentStageIndex = stages.indexOf(myVehicle.currentStage || 'Onboarding');

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
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

            {isJourneyComplete && <JourneyReport vehicle={myVehicle} passengers={passengers} onPrint={handlePrintReport} />}

            {!isJourneyComplete && (
                <>
                    {/* Progress Bar */}
                    <div className="mb-8 overflow-x-auto pb-4">
                        <div className="flex items-center justify-between min-w-[600px] relative">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full" />
                            <div className="absolute top-1/2 left-0 h-1 bg-ministry-orange -z-10 rounded-full transition-all duration-500" style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }} />
                            {stages.map((stage, idx) => {
                                const isActive = idx === currentStageIndex;
                                const isCompleted = idx < currentStageIndex;
                                let label = stage;
                                if (stage === 'RegApproval') label = 'Reg. Verify';
                                if (stage === 'FinanceApproval') label = 'Finance';
                                return (
                                    <div key={stage} className="flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 ${isActive ? 'border-ministry-neon bg-black text-ministry-neon scale-110' : isCompleted ? 'border-ministry-orange bg-ministry-orange text-white' : 'border-gray-200 bg-white text-gray-300'}`}>
                                            {isCompleted ? <Check className="w-5 h-5" /> : (idx + 1)}
                                        </div>
                                        <span className={`mt-2 text-xs font-bold ${isActive ? 'text-ministry-text' : 'text-gray-400'}`}>{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Stage Content */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                        {(myVehicle.currentStage === 'Transit' || myVehicle.currentStage === 'Arrived') ? (
                            <div className="relative h-[500px] bg-gray-100 w-full flex flex-col">
                                {isLoaded ? (
                                    <>
                                        <GoogleMap
                                        mapContainerStyle={mapContainerStyle}
                                        center={{ lat: myVehicle.location?.lat || DEFAULT_CENTER.lat, lng: myVehicle.location?.lng || DEFAULT_CENTER.lng }}
                                        zoom={14} onLoad={onLoad} onUnmount={onUnmount}
                                        options={{ mapTypeId: 'roadmap' }}
                                    >
                                        {myVehicle.location && (
                                            <Marker
                                                position={{ lat: myVehicle.location.lat, lng: myVehicle.location.lng }}
                                                title={myVehicle.number_plate}
                                                icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png', labelOrigin: (window as any).google ? new (window as any).google.maps.Point(16, -20) : undefined }}
                                                label={{ text: myVehicle.number_plate, color: 'white', fontWeight: 'bold', fontSize: '12px', className: 'bg-orange-500 px-2 py-1 rounded shadow-md font-bold' }}
                                            />
                                        )}
                                        {userLocation && (
                                            <Marker
                                                position={userLocation}
                                                title="My Location"
                                                icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
                                            />
                                        )}
                                    </GoogleMap>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (navigator.geolocation && mapInstance) {
                                                navigator.geolocation.getCurrentPosition(
                                                    (position) => {
                                                        (mapInstance as any).panTo({ lat: position.coords.latitude, lng: position.coords.longitude });
                                                        (mapInstance as any).setZoom(15);
                                                    },
                                                    (error) => console.error("Error getting location", error)
                                                );
                                            }
                                        }}
                                        className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-lg hover:bg-gray-50 border border-gray-200 transition-colors z-10 text-gray-700 focus:outline-none"
                                        title="Go to my location"
                                    >
                                        <LocateFixed className="w-5 h-5 text-gray-600" />
                                    </button>
                                </>
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
                                            disabled={!!submittingStage}
                                            className={`bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold text-lg shadow-xl flex items-center transform hover:scale-105 transition-all ${submittingStage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {submittingStage === 'Arrived' ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <MapPin className="w-5 h-5 mr-2" />}
                                            {submittingStage === 'Arrived' ? 'Processing...' : 'Confirm Arrival'}
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
                                            disabled={!!submittingStage}
                                            className={`bg-black text-ministry-neon px-8 py-3 rounded-full font-bold text-lg shadow-xl flex items-center transform hover:scale-105 transition-all ${submittingStage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {submittingStage === 'Onboarding' ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ChevronRight className="w-5 h-5 mr-2" />}
                                            {submittingStage === 'Onboarding' ? 'Processing...' : 'Start Return Journey'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6">
                                {/* Onboarding / Verifying */}
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
                                                <div className="py-10 text-center text-gray-400">No passengers assigned yet.</div>
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
                                                            onClick={e => { e.stopPropagation(); handleMarkSoulWon(p.id); }}
                                                            className={`p-2 rounded-lg transition-colors ${p.soulWon ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
                                                            title={p.soulWon ? 'Unmark Soul Won' : 'Mark as Soul Won'}
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
                                                    <input value={returnPassengerForm.name} onChange={e => setReturnPassengerForm({ ...returnPassengerForm, name: e.target.value })} placeholder="Name" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ministry-orange" />
                                                    <div className="w-full">
                                                        <PhoneInput value={returnPassengerForm.contact} onChange={val => setReturnPassengerForm({ ...returnPassengerForm, contact: val })} placeholder="Contact" className="h-[38px]" />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input value={returnPassengerForm.residence} onChange={e => setReturnPassengerForm({ ...returnPassengerForm, residence: e.target.value })} placeholder="Residence" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ministry-orange" />
                                                        <button type="submit" className="bg-gray-900 text-white p-2 rounded-lg hover:bg-black"><Plus className="w-5 h-5" /></button>
                                                    </div>
                                                </div>
                                            </form>
                                        )}

                                        <div className="pt-4 flex justify-end">
                                            {myVehicle.currentStage === 'Onboarding' && (
                                                <button
                                                    onClick={() => handleStageUpdate('Verifying')}
                                                    disabled={passengers.length === 0 || !!submittingStage}
                                                    className={`bg-ministry-text text-white px-6 py-3 rounded-xl font-bold flex items-center hover:bg-gray-800 transition-all ${(passengers.length === 0 || !!submittingStage) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {submittingStage === 'Verifying' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                                                    {submittingStage === 'Verifying' ? 'Processing...' : 'Approve Onboarding'}
                                                </button>
                                            )}
                                            {myVehicle.currentStage === 'Verifying' && (
                                                <button
                                                    onClick={async () => {
                                                        if (!myVehicle) return;
                                                        if (passengers.length === 0) { showToast('Cannot approve empty vehicle.', 'error'); return; }
                                                        if (passengers.length > 80) { showToast('Exceeds submission limits. Please split the manifest.', 'error'); return; }
                                                        const unverified = passengers.filter(p => !p.verified).length;
                                                        if (activeJourneyTab === 'Return' && unverified > 0) {
                                                            const verified = passengers.length - unverified;
                                                            const ok = await askConfirm(<span>You have confirmed <strong>{verified}/{passengers.length}</strong> members. Continue?</span>, { title: 'Confirm Verification', confirmText: 'Yes, Continue', cancelText: 'Go Back' });
                                                            if (ok) handleStageUpdate('FinanceApproval');
                                                        } else {
                                                            if (activeJourneyTab === 'Ongoing') { handleStageUpdate('RegApproval'); }
                                                            else handleStageUpdate('FinanceApproval');
                                                        }
                                                    }}
                                                    disabled={passengers.length === 0 || !!submittingStage}
                                                    className={`bg-ministry-orange text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg transition-all ${passengers.length === 0 || !!submittingStage ? 'opacity-50 cursor-not-allowed hover:bg-orange-600' : 'hover:bg-orange-600'}`}
                                                >
                                                    {submittingStage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                                                    {submittingStage ? 'Processing...' : 'Submit Manifest'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Approval Wait States */}
                                {(myVehicle.currentStage === 'RegApproval' || myVehicle.currentStage === 'FinanceApproval') && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                            {myVehicle.currentStage === 'RegApproval' ? <FileCheck className="w-10 h-10 text-orange-500" /> : <DollarSign className="w-10 h-10 text-green-600" />}
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                            {myVehicle.currentStage === 'RegApproval' ? 'Awaiting Registration Verification' : 'Awaiting Finance Approval'}
                                        </h3>
                                        <p className="text-gray-500 max-w-sm mb-6">The central team is reviewing your manifest. Please wait for approval to proceed.</p>
                                        <div className="flex flex-col gap-3 items-center">
                                            {activeJourneyTab === 'Ongoing' && (
                                                <button onClick={() => {
                                                    const payload = {
                                                        CordinatorsContactInformation: {
                                                            Name: {
                                                                First: user?.name?.split(' ')[0] || '',
                                                                Last: user?.name?.split(' ').slice(1).join(' ') || ''
                                                            },
                                                            Phone: user?.contact || '',
                                                            Region: 'Central',
                                                            NameOfRegionManifest: 'Manifest Entebbe',
                                                            VehicleNumberPlate: myVehicle?.number_plate || 'UAB 123C'
                                                        },
                                                        ListOfTransportedPeople: passengers.map(p => {
                                                            let cleanPhone = p.contact ? p.contact.replace(/\D/g, '') : '';
                                                            if (cleanPhone.length < 9) cleanPhone = '256700000000';
                                                            return {
                                                                Name: p.name,
                                                                Phone: cleanPhone,
                                                                FirstTimer: p.isFirstTime === 'Yes',
                                                                Department: p.category === 'Member' ? 'Residential' : (p.category === 'Student' ? 'School' : 'Institution'),
                                                                Institution: p.school ? 'Yes' : 'No',
                                                                InstitutionName: p.school || '',
                                                                SchoolName: p.school || ''
                                                            };
                                                        })
                                                    };
                                                    const encodedUrl = `${cognitoFormUrl}?entry=${encodeURIComponent(JSON.stringify(payload))}`;
                                                    window.open(encodedUrl, '_blank');
                                                }} className="bg-ministry-orange text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors flex items-center shadow">
                                                    <ExternalLink className="w-4 h-4 mr-2" /> Open Cognito form
                                                </button>
                                            )}
                                            <button onClick={() => refreshData()} className="flex items-center text-gray-500 hover:text-ministry-orange transition-colors text-sm font-medium">
                                                <RefreshCw className="w-4 h-4 mr-2" /> Refresh Status
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// ─── HOD Fleet Overview ───────────────────────────────────────────────────────

const HodOverview: React.FC = () => {
    const {
        vehicles, passengers, coordinators, selectedEventId, selectedEvent, filteredEvents,
        setSelectedEventId, filterStatus, setFilterStatus, isAssigning, setIsAssigning,
        selectedCoordinator, setSelectedCoordinator, adminViewMode, setAdminViewMode,
        selectedAdminVehicle, adminVehiclePassengers, adminDetailTab, setAdminDetailTab,
        handleOpenAdminVehicle, handleBackToFleet, handleAssignCoordinator, handlePrintReport,
        showHighlights, setShowHighlights, refreshData
    } = useTransport();

    const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: 'AIzaSyCZSpPjUuv2sILESSb2yqYNxhzr9CfCtzs' });
    const [mapInstance, setMapInstance] = React.useState(null);
    const onLoad = React.useCallback((map: any) => setMapInstance(map), []);
    const onUnmount = React.useCallback(() => setMapInstance(null), []);

    const activeVehicles = vehicles.filter(v => filterStatus === 'All' ? true : v.status === filterStatus);
    const totalVehicles = vehicles.length;
    const inTransit = vehicles.filter(v => v.currentStage === 'Transit').length;
    const delayed = vehicles.filter(v => v.isDelayed).length;
    const totalPeopleCount = passengers.length + vehicles.reduce((sum, v) => sum + (v.childrenCount || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Bus className="w-6 h-6 text-ministry-orange" />
                        <h1 className="text-2xl md:text-3xl font-bold text-ministry-text">Transportation Command</h1>
                    </div>
                    <p className="text-gray-500">Real-time fleet tracking and coordinator dispatch.</p>
                </div>
                <div className="flex items-stretch gap-3">
                    {adminViewMode === 'list' && (
                        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm flex flex-col justify-center">
                            <label className="block text-xs font-bold text-gray-400 uppercase">Active Operation</label>
                            <select
                                value={selectedEventId}
                                onChange={e => setSelectedEventId(e.target.value)}
                                className="font-bold text-ministry-text outline-none bg-transparent w-full cursor-pointer min-w-[200px]"
                            >
                                {filteredEvents.map(e => (
                                    <option key={e.id} value={e.id}>{e.title}{isEventLocked(e.date) ? ' (Locked)' : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {adminViewMode === 'list' && selectedEvent && isEventLocked(selectedEvent.date) && (
                        <button onClick={() => setShowHighlights(true)} className="bg-gray-900 text-white px-4 md:px-5 rounded-xl text-sm font-bold hover:bg-black transition-all flex items-center justify-center shadow-lg whitespace-nowrap">
                            <Activity className="w-5 h-5 md:mr-2 text-ministry-neon" /> <span className="hidden md:inline">View Highlights</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Detail View */}
            {adminViewMode === 'detail' && selectedAdminVehicle ? (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <button onClick={handleBackToFleet} className="mb-4 flex items-center text-gray-500 hover:text-ministry-orange font-bold text-sm">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Fleet
                    </button>
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
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
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Driver</p>
                                    <p className="font-bold text-gray-800 text-lg">{selectedAdminVehicle.driverName}</p>
                                    <div className="flex items-center text-sm text-gray-500 mt-1"><Phone className="w-3 h-3 mr-1" /> {selectedAdminVehicle.driverContact}</div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Coordinator</p>
                                    <p className="font-bold text-gray-800 text-lg">{selectedAdminVehicle.coordinator}</p>
                                    <div className="flex items-center text-sm text-gray-500 mt-1"><Users className="w-3 h-3 mr-1" /> Assigned</div>
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
                                    {(['manifest', 'live', 'report'] as const).map(tab => (
                                        <button key={tab} onClick={() => setAdminDetailTab(tab)}
                                            className={`flex-1 p-3 rounded-xl font-bold transition-all border capitalize ${adminDetailTab === tab ? (tab === 'live' ? 'bg-ministry-orange text-white' : tab === 'report' ? 'bg-green-600 text-white' : 'bg-black text-white') : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {adminDetailTab === 'manifest' && (
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4">Name</th><th className="px-6 py-4">Category</th>
                                                <th className="px-6 py-4">Contact</th><th className="px-6 py-4">Residence</th>
                                                <th className="px-6 py-4">Verified</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {adminVehiclePassengers.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No passengers registered.</td></tr>
                                            ) : adminVehiclePassengers.map(p => (
                                                <tr key={p.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                                                    <td className="px-6 py-4 text-sm">{p.category}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{p.contact}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{p.residence}</td>
                                                    <td className="px-6 py-4">{p.verified ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-300" />}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {adminDetailTab === 'live' && (
                                <div className="bg-gray-100 rounded-xl p-4 h-[500px] flex flex-col relative overflow-hidden">
                                    <div className="absolute top-4 right-4 z-10 bg-black/80 text-white px-4 py-2 rounded-lg backdrop-blur-md">
                                        <p className="text-xs text-gray-400 uppercase font-bold">Current Stage</p>
                                        <p className="font-bold text-ministry-neon">{selectedAdminVehicle.currentStage || 'Unknown'}</p>
                                    </div>
                                    {isLoaded ? (
                                        <GoogleMap mapContainerStyle={mapContainerStyle}
                                            center={{ lat: selectedAdminVehicle.location?.lat || DEFAULT_CENTER.lat, lng: selectedAdminVehicle.location?.lng || DEFAULT_CENTER.lng }}
                                            zoom={15} onLoad={onLoad} onUnmount={onUnmount} options={{ mapTypeId: 'roadmap' }}>
                                            {selectedAdminVehicle.location && (
                                                <Marker position={{ lat: selectedAdminVehicle.location.lat, lng: selectedAdminVehicle.location.lng }}
                                                    label={{ text: selectedAdminVehicle.number_plate, color: 'white', fontWeight: 'bold', fontSize: '14px' }}
                                                    icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png', labelOrigin: (window as any).google ? new (window as any).google.maps.Point(16, -20) : undefined }}
                                                />
                                            )}
                                        </GoogleMap>
                                    ) : <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">Loading Map View...</div>}
                                </div>
                            )}

                            {adminDetailTab === 'report' && (
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <JourneyReport vehicle={selectedAdminVehicle} passengers={adminVehiclePassengers} onPrint={handlePrintReport} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* Fleet List */
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { label: 'Total People', value: totalPeopleCount, icon: <Users className="w-5 h-5 text-ministry-orange" />, iconBg: 'bg-orange-50' },
                            { label: 'Total Fleet', value: totalVehicles, icon: <Bus className="w-5 h-5 text-gray-600" />, iconBg: 'bg-gray-100' },
                            { label: 'In Transit', value: inTransit, icon: <Navigation className="w-5 h-5 text-blue-600" />, iconBg: 'bg-blue-100' },
                            { label: 'Alerts', value: delayed, icon: <AlertTriangle className="w-5 h-5 text-ministry-orange" />, iconBg: 'bg-orange-100', valueClass: 'text-ministry-orange' },
                            { label: 'Arrived', value: vehicles.filter(v => v.currentStage === 'Arrived').length, icon: <CheckCircle className="w-5 h-5 text-green-600" />, iconBg: 'bg-green-100', valueClass: 'text-green-600' },
                        ].map(stat => (
                            <div key={stat.label} className="bg-ministry-card border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">{stat.label}</p>
                                    <h3 className={`text-2xl font-bold ${stat.valueClass || 'text-ministry-text'}`}>{stat.value.toLocaleString()}</h3>
                                </div>
                                <div className={`p-2 ${stat.iconBg} rounded-lg`}>{stat.icon}</div>
                            </div>
                        ))}
                    </div>

                    {/* Map + Fleet List */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="border border-gray-200 rounded-2xl p-1 shadow-sm overflow-hidden relative h-[500px] bg-gray-900">
                                {isLoaded ? (
                                    <GoogleMap mapContainerStyle={mapContainerStyle} center={DEFAULT_CENTER} zoom={11} onLoad={onLoad} onUnmount={onUnmount} options={{ mapTypeId: 'roadmap' }}>
                                        {activeVehicles.map(v => v.location && (
                                            <Marker key={v.id}
                                                position={{ lat: v.location.lat, lng: v.location.lng }}
                                                label={{ text: v.coordinator || 'Unassigned', color: 'white', fontWeight: 'bold', fontSize: '12px' }}
                                                icon={{ url: v.isDelayed ? 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/green-dot.png', labelOrigin: (window as any).google ? new (window as any).google.maps.Point(16, -20) : undefined }}
                                                title={`${v.number_plate} - ${v.coordinator}`}
                                            />
                                        ))}
                                    </GoogleMap>
                                ) : <div className="w-full h-full flex items-center justify-center text-white">Loading Live View...</div>}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg text-ministry-text">Fleet Operations</h3>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    {(['All', 'En Route', 'Arrived', 'Completed'] as const).map(s => (
                                        <button key={s} onClick={() => setFilterStatus(s as any)}
                                            className={`px-2 py-1 text-[10px] font-bold rounded ${filterStatus === s ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
                                            {s === 'En Route' ? 'Moving' : s === 'Completed' ? 'Done' : s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-ministry-card border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
                                <div className="p-4 border-b border-gray-100">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ministry-orange" placeholder="Search plate or driver..." />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {activeVehicles.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400">
                                            {totalVehicles === 0 ? 'No vehicles assigned to this operation.' : 'No vehicles match the filter.'}
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
                                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border mt-1 inline-block ${v.journeyDirection === 'Return' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                                {v.journeyDirection || 'Ongoing'}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v.status === 'Completed' ? 'bg-green-600 text-white' : v.currentStage === 'Arrived' ? 'bg-green-100 text-green-700' : v.currentStage === 'Transit' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                                {v.status === 'Completed' ? 'Completed' : (v.currentStage || 'Pending')}
                                                            </span>
                                                            {v.currentStage !== 'Arrived' && <p className="text-xs text-gray-400 mt-1">ETA: {v.eta}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-gray-100 h-1.5 rounded-full mb-3 overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-1000 ${v.isDelayed ? 'bg-ministry-orange' : 'bg-ministry-neon'}`} style={{ width: `${v.progress}%` }} />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <span className="font-bold mr-1">Coord:</span>
                                                            {isAssigning === v.id ? (
                                                                <div className="flex items-center space-x-1">
                                                                    <select autoFocus className="bg-white border border-gray-300 rounded px-1 py-0.5 max-w-[120px]"
                                                                        value={selectedCoordinator} onChange={e => setSelectedCoordinator(e.target.value)}>
                                                                        {coordinators.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                                        {coordinators.length === 0 && <option value="">No Coords</option>}
                                                                    </select>
                                                                    <button onClick={() => handleAssignCoordinator(v.id)} className="bg-green-100 text-green-700 p-1 rounded hover:bg-green-200"><CheckCircle className="w-3 h-3" /></button>
                                                                </div>
                                                            ) : (
                                                                <span className={!v.coordinator ? 'text-red-400 italic' : ''}>
                                                                    {v.coordinator || 'Unassigned'}
                                                                    {v.coordinatorContact && v.coordinatorContact !== 'N/A' && <span className="text-gray-400 font-normal ml-1">({v.coordinatorContact})</span>}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {!v.coordinator && !isAssigning && !isEventLocked(selectedEvent?.date || '') && (
                                                            <button onClick={() => setIsAssigning(v.id)} className="text-xs font-bold text-ministry-orange hover:text-orange-700 flex items-center">
                                                                <UserPlus className="w-3 h-3 mr-1" /> Assign
                                                            </button>
                                                        )}
                                                        {v.coordinator && (
                                                            <button onClick={() => handleOpenAdminVehicle(v)} className="text-xs font-bold text-gray-500 hover:text-ministry-text flex items-center bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">
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
        </div>
    );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

const OverviewTab: React.FC = () => {
    const { isCoordinatorView } = useTransport();
    return isCoordinatorView ? <CoordinatorView /> : <HodOverview />;
};

export default OverviewTab;
