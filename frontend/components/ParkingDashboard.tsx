import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useNotification } from './ui/NotificationSystem';
import { PersonalVehicle, MinistryEvent, ModalType } from '../types';
import {
    Car,
    CheckCircle,
    Database,
} from 'lucide-react';
import { ParkingStore } from '../database/parkingStore';
import { mapPersonalVehicleFromDB } from '../database/vehicleStore';
import { supabase } from '../services/supabaseClient';
import { CheckInTab } from './parking/CheckInTab';
import { DatabaseTab } from './parking/DatabaseTab';

interface ParkingDashboardProps {
    events?: MinistryEvent[];
    onOpenModal?: (type: ModalType) => void;
    urlTab?: ParkingTab;
    currentUser?: any;
}

type ParkingTab = 'checkin' | 'database';
type ViewMode = 'list' | 'service-active' | 'register-new' | 'add-vehicle-db' | 'bulk-add';

const ParkingDashboard: React.FC<ParkingDashboardProps> = ({ currentUser, events = [], onOpenModal, urlTab }) => {
    const { showToast, confirm: askConfirm } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = location.pathname.replace(/\/[^/]+$/, '');

    const [activeTab, setActiveTab] = useState<ParkingTab>(urlTab || 'checkin');

    const switchTab = (tab: ParkingTab) => {
        setActiveTab(tab);
        navigate(`${basePath}/${tab}`);
    };
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [vehicles, setVehicles] = useState<PersonalVehicle[]>([]);

    // URL-driven service selection — must be declared before urlTab effect
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedServiceId = searchParams.get('serviceId') || null;
    const selectedService = events.find(e => e.id === selectedServiceId) || null;
    const setSelectedService = (svc: MinistryEvent | null) => {
        setSearchParams(prev => {
            if (svc) prev.set('serviceId', svc.id);
            else prev.delete('serviceId');
            return prev;
        }, { replace: true });
    };

    useEffect(() => {
        if (urlTab) {
            setActiveTab(urlTab);
            setViewMode('list');
            if (urlTab !== 'checkin') {
                setSelectedService(null);
            }
        }
    }, [urlTab]);

    // Sync viewMode when browser back/forward changes URL params
    const urlView = searchParams.get('view');
    useEffect(() => {
        // Browser back removed ?serviceId= while in service view → go to list
        if (!selectedServiceId && (viewMode === 'service-active' || viewMode === 'register-new')) {
            setViewMode('list');
        }
        // Browser back removed ?view= while a form was open
        if (!urlView && viewMode === 'register-new') {
            setViewMode(selectedServiceId ? 'service-active' : 'list');
        }
        if (!urlView && (viewMode === 'add-vehicle-db' || viewMode === 'bulk-add')) {
            setViewMode('list');
        }
    }, [selectedServiceId, urlView]);

    const refreshData = async () => {
        const data = await ParkingStore.getAll();
        setVehicles(data);
    };

    useEffect(() => {
        refreshData();

        const channel = supabase.channel('parking-live')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'personal_vehicles' }, (payload) => {
                const mapped = mapPersonalVehicleFromDB(payload.new);
                setVehicles(prev => {
                    if (prev.find(v => v.id === mapped.id)) return prev;
                    return [mapped, ...prev];
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'personal_vehicles' }, (payload) => {
                const mapped = mapPersonalVehicleFromDB(payload.new);
                setVehicles(prev => prev.map(v => v.id === mapped.id ? mapped : v));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'personal_vehicles' }, (payload) => {
                const deletedId = payload.old.id;
                setVehicles(prev => prev.filter(v => v.id !== deletedId));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const services = events.filter(e => e.type === 'Service').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredVehicles = vehicles.filter(v => {
        const lowerQuery = searchQuery.toLowerCase().trim();
        if (!lowerQuery) return true;

        const tokens = lowerQuery.split(/\\s+/).filter(Boolean);
        const plate = v.number_plate.toLowerCase();
        const name = v.driverName.toLowerCase();
        const contact = v.driverContact.replace(/\\D/g, '');

        return tokens.every(token => {
            const cleanPlate = plate.replace(/\\s/g, '');
            if (plate.includes(token) || cleanPlate.includes(token)) return true;
            if (name.includes(token)) return true;
            const cleanToken = token.replace(/\\D/g, '');
            if (cleanToken.length > 0 && contact.includes(cleanToken)) return true;
            return false;
        });
    });

    const parkingTabs = [
        { key: 'checkin' as ParkingTab, icon: CheckCircle, label: 'Check-In' },
        { key: 'database' as ParkingTab, icon: Database, label: 'Vehicle DB' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-28 md:pb-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-ministry-text flex items-center gap-3">
                        <Car className="w-7 h-7 md:w-8 md:h-8 text-ministry-orange" />
                        Parking Management
                    </h1>
                    <p className="text-gray-500 text-sm md:text-base">Vehicle registration, access control, and service check-ins.</p>
                </div>
            </div>

            {/* Desktop Navigation Tabs (hidden on mobile) */}
            {viewMode === 'list' && (
                <div className="hidden md:block w-full overflow-x-auto hide-scrollbar pb-2 -mb-2">
                    <div className="flex space-x-1 bg-white/60 backdrop-blur-md p-1.5 rounded-full w-max border border-gray-100 shadow-sm">
                        <button
                            onClick={() => switchTab('checkin')}
                            className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'checkin'
                                ? 'bg-black text-white shadow-md ring-1 ring-gray-200/50'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                                }`}
                        >
                            <CheckCircle className={`w-4 h-4 ${activeTab === 'checkin' ? 'text-ministry-neon' : ''}`} />
                            <span>Check-In</span>
                        </button>
                        <button
                            onClick={() => switchTab('database')}
                            className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'database'
                                ? 'bg-black text-white shadow-md ring-1 ring-gray-200/50'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                                }`}
                        >
                            <Database className={`w-4 h-4 ${activeTab === 'database' ? 'text-ministry-neon' : ''}`} />
                            <span>Vehicle Database</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area — no card wrapper on mobile */}
            <div className="md:bg-ministry-card md:border md:border-gray-200 md:rounded-2xl md:p-6 md:shadow-sm min-h-[500px]">
                {activeTab === 'checkin' && (
                    <CheckInTab
                        services={services}
                        vehicles={vehicles}
                        setVehicles={setVehicles}
                        filteredVehicles={filteredVehicles}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        selectedService={selectedService}
                        setSelectedService={setSelectedService}
                    />
                )}
                
                {activeTab === 'database' && (
                    <DatabaseTab
                        vehicles={vehicles}
                        setVehicles={setVehicles}
                        filteredVehicles={filteredVehicles}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                    />
                )}
            </div>

            {/* ── Mobile Floating Bottom Navigation ────────────────────────── */}
            {viewMode === 'list' && (
                <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm">
                    <div className="flex items-center justify-between gap-1 bg-white/90 backdrop-blur-xl p-1.5 rounded-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                        {parkingTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => switchTab(tab.key)}
                                    className={`flex flex-col items-center justify-center w-full py-2 rounded-full transition-all duration-300 relative overflow-hidden ${
                                        isActive ? 'text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                                    }`}
                                >
                                    {isActive && (
                                        <div className="absolute inset-0 bg-black rounded-full scale-100 animate-in zoom-in duration-300" />
                                    )}
                                    <div className="relative z-10 flex flex-col items-center gap-1">
                                        <Icon strokeWidth={isActive ? 2.5 : 2} className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'text-ministry-neon scale-110' : ''}`} />
                                        <span className={`text-[10px] tracking-wide transition-all duration-300 ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                                            {tab.label}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParkingDashboard;
