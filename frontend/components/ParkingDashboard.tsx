import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

    // [PHASE F] activeTab is URL-driven when urlTab prop is provided.
    const [activeTab, setActiveTab] = useState<ParkingTab>(urlTab || 'checkin');
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

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-ministry-text flex items-center gap-3">
                        <Car className="w-8 h-8 text-ministry-orange" />
                        Parking Management
                    </h1>
                    <p className="text-gray-500">Vehicle registration, access control, and service check-ins.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            {viewMode === 'list' && (
                <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit">
                    <button
                        onClick={() => { setActiveTab('checkin'); navigate('/parking/checkin'); }}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'checkin'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <CheckCircle className={`w-4 h-4 ${activeTab === 'checkin' ? 'text-ministry-neon' : ''}`} />
                        <span>Check-In</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('database'); navigate('/parking/database'); }}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'database'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <Database className={`w-4 h-4 ${activeTab === 'database' ? 'text-ministry-neon' : ''}`} />
                        <span>Vehicle Database</span>
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className="bg-ministry-card border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px]">
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
        </div>
    );
};

export default ParkingDashboard;
