
import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { isServiceClosed, validatePlate } from '../utils';
import { PersonalVehicle, MinistryEvent, ModalType } from '../types';
import {
    Car,
    Search,
    Plus,
    CheckCircle,
    Clock,
    Calendar,
    ArrowLeft,
    ScanLine,
    UserPlus,
    Database,
    Phone,
    LogOut,
    MapPin,
    QrCode,
    Activity,
    FileText,
    Upload
} from 'lucide-react';
import { ParkingStore } from '../database/parkingStore';
import { supabase } from '../services/supabaseClient';
import NumberPlateInput from './NumberPlateInput';
import PhoneInput from './PhoneInput';


interface ParkingDashboardProps {
    events?: MinistryEvent[];
    onOpenModal?: (type: ModalType) => void;
}

type ParkingTab = 'checkin' | 'database';
type ViewMode = 'list' | 'service-active' | 'register-new' | 'add-vehicle-db' | 'bulk-add';

const ParkingDashboard: React.FC<ParkingDashboardProps> = ({ events = [], onOpenModal }) => {
    const { showToast } = useNotification();
    const [activeTab, setActiveTab] = useState<ParkingTab>('checkin');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [vehicles, setVehicles] = useState<PersonalVehicle[]>([]);
    const [selectedService, setSelectedService] = useState<MinistryEvent | null>(null);

    // Force re-render state
    const [, forceUpdate] = useState(0);

    const refreshData = async () => {
        const data = await ParkingStore.getAll();
        setVehicles(data);
    };

    // Initialize Data & Realtime
    useEffect(() => {
        refreshData();

        const channel = supabase.channel('parking-live')
            // Personal Vehicles: Granular Updates
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'personal_vehicles' }, (payload) => {
                const newVehicle = payload.new as any;
                setVehicles(prev => {
                    if (prev.find(v => v.id === newVehicle.id)) return prev;
                    const mapped: PersonalVehicle = {
                        id: newVehicle.id,
                        number_plate: newVehicle.number_plate,
                        driverName: newVehicle.driver_name,
                        driverContact: newVehicle.driver_contact,
                        status: newVehicle.status,
                        checkInTime: newVehicle.check_in_time,
                        checkOutTime: newVehicle.check_out_time,
                        currentServiceId: newVehicle.current_service_id,
                        registeredDate: newVehicle.registered_date,
                        attendedServiceIds: newVehicle.attended_service_ids || []
                    };
                    return [mapped, ...prev];
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'personal_vehicles' }, (payload) => {
                const updated = payload.new as any;
                setVehicles(prev => prev.map(v => {
                    if (v.id === updated.id) {
                        return {
                            ...v,
                            number_plate: updated.number_plate,
                            driverName: updated.driver_name,
                            driverContact: updated.driver_contact,
                            status: updated.status,
                            checkInTime: updated.check_in_time,
                            checkOutTime: updated.check_out_time,
                            currentServiceId: updated.current_service_id,
                            attendedServiceIds: updated.attended_service_ids || []
                        };
                    }
                    return v;
                }));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'personal_vehicles' }, (payload) => {
                const deletedId = payload.old.id;
                setVehicles(prev => prev.filter(v => v.id !== deletedId));
            })

            .on('postgres_changes', { event: '*', schema: 'public', table: 'ministry_events' }, () => {
                // Ideally handle event updates granularly or ignore if handled by parent
                refreshData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Auto-Reset Stale Vehicles (Service Closed)
    // Auto-Reset Stale Vehicles (Service Closed)
    /* 
    useEffect(() => {
        // Only run if we have data to check
        if (vehicles.length > 0 && events.length > 0) {
            const staleVehicles = vehicles.filter(v => {
                // Check if vehicle is 'Checked In'
                if (v.status === 'Checked In' && v.currentServiceId) {
                    const service = events.find(e => e.id === v.currentServiceId);
                    // If service exists and is closed, OR if service is missing (deleted?)
                    if (service && isServiceClosed(service.date)) {
                        return true;
                    }
                    // Optional: Handle deleted services if needed, but for now focus on Closed.
                }
                return false;
            });

            if (staleVehicles.length > 0) {

                // Update sequentially or in parallel
                staleVehicles.forEach(async (v) => {
                    // Reset to Absent
                    const updated = {
                        ...v,
                        status: 'Absent' as const,
                        checkOutTime: 'Auto-Reset',
                        currentServiceId: undefined, // Will be mapped to null in store
                        // attendedServiceIds preserved implicitly as they are part of ...v, assuming they are in the object.
                        // However, to be safe, we can explicitly pass them if needed, but spread ...v covers it IF getAll() returns it.
                        // Since we updated ParkingStore.getAll() to return it, it should be in 'v'.
                    };
                    await ParkingStore.update(updated);
                });
                // No need to call refreshData() here manually as Realtime will trigger it,
                // avoiding potential loops.
            }
        }
    }, [vehicles, events]); // Dependency on vehicles ensures it runs after fetch
    */

    // New Vehicle Form State
    const initialFormState = {
        number_plate: '',
        driverName: '',
        driverContact: '256' // Initialize with 256
    };
    const [formData, setFormData] = useState(initialFormState);
    const [bulkText, setBulkText] = useState('');

    const services = events.filter(e => e.type === 'Service').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filtered lists
    // Filtered lists
    const filteredVehicles = vehicles.filter(v => {
        const lowerQuery = searchQuery.toLowerCase().trim();
        if (!lowerQuery) return true;

        const tokens = lowerQuery.split(/\s+/).filter(Boolean);
        const plate = v.number_plate.toLowerCase();
        const name = v.driverName.toLowerCase();
        // Normalize contact for searching (remove spaces/dashes) to allow partial match like '772' matching '0772...'
        const contact = v.driverContact.replace(/\D/g, '');

        return tokens.every(token => {
            // Check Plate
            // Remove space from plate for flex search? e.g. "UBA123" vs "UBA 123"
            const cleanPlate = plate.replace(/\s/g, '');
            if (plate.includes(token) || cleanPlate.includes(token)) return true;

            // Check Name
            if (name.includes(token)) return true;

            // Check Contact (only if token contains digits)
            const cleanToken = token.replace(/\D/g, '');
            if (cleanToken.length > 0 && contact.includes(cleanToken)) return true;

            return false;
        });
    });

    const checkedInVehicles = vehicles.filter(v => v.status === 'Checked In' && v.currentServiceId === selectedService?.id);

    // Helper for contact validation
    const validateContact = (val: string) => {
        let digits = val.replace(/\D/g, '');
        if (digits.length > 12) digits = digits.slice(0, 12);
        if (digits.length > 0 && !digits.startsWith('256')) {
            return '256';
        }
        return digits;
    };


    // --- Handlers ---

    const handleOpenService = (service: MinistryEvent) => {
        setSelectedService(service);
        setViewMode('service-active');
        setSearchQuery('');
    };

    const handleBack = () => {
        if (viewMode === 'register-new') {
            setViewMode('service-active');
            setFormData(initialFormState);
            return;
        }
        if (viewMode === 'add-vehicle-db' || viewMode === 'bulk-add') {
            setViewMode('list');
            setFormData(initialFormState);
            setBulkText('');
            return;
        }
        setViewMode('list');
        setSelectedService(null);
        setSearchQuery('');
    };

    const handleCheckIn = async (vehicleId: string) => {
        if (!selectedService) return;
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (vehicle) {
            // Check In via Store (updates DB + Attendance Log)
            await ParkingStore.checkIn(vehicleId, selectedService.id);

            // Optimistic Update UI
            const history = vehicle.attendedServiceIds || [];
            const newHistory = history.includes(selectedService.id) ? history : [...history, selectedService.id];

            const updated: PersonalVehicle = {
                ...vehicle,
                status: 'Checked In',
                currentServiceId: selectedService.id,
                checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                attendedServiceIds: newHistory
            };

            setVehicles(prev => prev.map(v => v.id === vehicleId ? updated : v));
            showToast("Vehicle Checked In Successfully!", 'success');
        }
    };

    const handleCheckOut = async (vehicleId: string) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (vehicle) {
            await ParkingStore.checkOut(vehicleId);

            // Optimistic Update UI
            const updated: PersonalVehicle = {
                ...vehicle,
                status: 'Checked Out',
                checkOutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setVehicles(prev => prev.map(v => v.id === vehicleId ? updated : v));
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // This handler is for "Register & Check In" (Service context)
        if (!selectedService) return;

        // 1. Validate Plate Format
        const { valid, formatted } = validatePlate(formData.number_plate);
        if (!valid) {
            showToast(`Invalid Number Plate Format: "${formData.number_plate}".\nAllowed formats: UAA 123A or UA 123AA (e.g. UBA 123A)`, 'error');
            return;
        }

        // 2. Check Duplicates (Global System Check)
        // If vehicle exists ANYWHERE in the system with this plate
        const duplicate = vehicles.find(v => v.number_plate === formatted);
        if (duplicate) {
            showToast(`Error: Vehicle "${formatted}" already exists in the system.\nPlease search for it and Check In.`, 'error');
            return;
        }

        // Create as ABSENT first, then Check In
        const newVehicle: PersonalVehicle = {
            id: `pv-${Date.now()}`,
            number_plate: formatted,
            driverName: formData.driverName,
            driverContact: formData.driverContact, // numbers only, max 12 digits
            status: 'Absent',
            registeredDate: new Date().toISOString().split('T')[0],
            attendedServiceIds: []
        };

        // Add to DB
        await ParkingStore.add(newVehicle);

        // Update Local State (Absent)
        // setVehicles([newVehicle, ...vehicles]); // We wait to update state until check-in for cleaner UI transition

        // Perform Check In
        await ParkingStore.checkIn(newVehicle.id, selectedService.id);

        // Optimistic Final State
        const checkedInVehicle: PersonalVehicle = {
            ...newVehicle,
            status: 'Checked In',
            checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            currentServiceId: selectedService.id,
            attendedServiceIds: [selectedService.id]
        };

        setVehicles([checkedInVehicle, ...vehicles]);
        setFormData(initialFormState);
        setViewMode('service-active');
        showToast(`Vehicle ${newVehicle.number_plate} Registered & Checked In!`, 'success');
    };

    const handleAddDatabaseVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        // This handler is for "Add to Database" (No Check In)

        // 1. Validate Plate Format
        const { valid, formatted } = validatePlate(formData.number_plate);
        if (!valid) {
            showToast(`Invalid Number Plate Format: "${formData.number_plate}".\nAllowed formats: UAA 123A or UA 123AA (e.g. UBA 123A)`, 'error');
            return;
        }

        // 2. Check Duplicates
        const duplicate = vehicles.find(v => v.number_plate === formatted);
        if (duplicate) {
            showToast(`Error: Vehicle "${formatted}" already exists in the system.`, 'error');
            return;
        }

        const newVehicle: PersonalVehicle = {
            id: `pv-${Date.now()}`,
            number_plate: formatted,
            driverName: formData.driverName,
            driverContact: formData.driverContact,
            status: 'Absent',
            registeredDate: new Date().toISOString().split('T')[0]
        };

        await ParkingStore.add(newVehicle);
        setVehicles([newVehicle, ...vehicles]);
        setFormData(initialFormState);
        setViewMode('list');
        showToast(`Vehicle ${newVehicle.number_plate} added to database.`, 'success');
    };

    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const lines = bulkText.split('\n');
        const newVehicles: PersonalVehicle[] = [];
        let count = 0;

        lines.forEach(line => {
            // Expected format: Plate, Name, Contact
            const parts = line.split(',');
            if (parts.length >= 1) {
                const plate = parts[0].trim();
                const name = parts[1] ? parts[1].trim() : 'Unknown';
                const contact = parts[2] ? parts[2].trim() : '';

                if (plate) {
                    newVehicles.push({
                        id: `pv-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        number_plate: plate.toUpperCase(),
                        driverName: name,
                        driverContact: contact,
                        status: 'Absent',
                        registeredDate: new Date().toISOString().split('T')[0]
                    });
                    count++;
                }
            }
        });

        if (count > 0) {
            // Add all sequentially (could be batch optimize but loop is fine for now)
            for (const v of newVehicles) {
                await ParkingStore.add(v);
            }
            setVehicles([...newVehicles, ...vehicles]);
            setBulkText('');
            setViewMode('list');
            showToast(`${count} vehicles imported successfully.`, 'success');
        } else {
            showToast("No valid data found to import.", 'error');
        }
    };

    const handleScanQR = () => {
        showToast("Scanning Interface Active... (Camera integration placeholder)", 'info');
    };

    // --- Render ---

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

            {/* Navigation Tabs (Only visible when not in sub-views for clarity, or always) */}
            {viewMode === 'list' && (
                <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('checkin')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'checkin'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <CheckCircle className={`w-4 h-4 ${activeTab === 'checkin' ? 'text-ministry-neon' : ''}`} />
                        <span>Check-In</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('database')}
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

                {/* --- SERVICE LIST (CHECK-IN) --- */}
                {activeTab === 'checkin' && viewMode === 'list' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Select Service for Parking</h3>
                        </div>
                        {services.length === 0 ? (
                            <div className="col-span-1 md:col-span-2 lg:col-span-3 py-12 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-500 mb-2">No Active Services Found</h3>
                                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                                    Please verify that Ministry Events have been created in the system. As a non-admin, you can only see existing services.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {services.map(service => {
                                    const isPast = isServiceClosed(service.date);

                                    return (
                                        <div key={service.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-ministry-orange/40 hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                                    {isPast ? 'Past Service' : 'Active / Upcoming'}
                                                </span>
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <h4 className="text-lg font-bold text-ministry-text mb-1">{service.title}</h4>
                                            <p className="text-sm text-gray-500 mb-4 flex items-center">
                                                <Clock className="w-3 h-3 mr-1" /> {service.date} at {service.time}
                                            </p>
                                            <button
                                                onClick={() => handleOpenService(service)}
                                                className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center transition-colors ${isPast
                                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    : 'bg-ministry-text text-white hover:bg-ministry-orange'
                                                    }`}
                                            >
                                                <Car className="w-4 h-4 mr-2" />
                                                {isPast ? 'View Records' : 'Open Check-In'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* --- ACTIVE SERVICE CHECK-IN --- */}
                {viewMode === 'service-active' && selectedService && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center space-x-3">
                                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <div>
                                    <h2 className="text-xl font-bold text-ministry-text">{selectedService.title}</h2>
                                    <p className="text-sm text-gray-500">
                                        Vehicle Check-In • {selectedService.date}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {!isServiceClosed(selectedService.date) && (
                                    <>
                                        <button
                                            onClick={handleScanQR}
                                            className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-bold"
                                        >
                                            <QrCode className="w-4 h-4" />
                                            <span className="hidden md:inline">Scan QR</span>
                                        </button>
                                        <button
                                            onClick={() => setViewMode('register-new')}
                                            className="flex items-center space-x-2 bg-ministry-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 shadow-md font-bold"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span className="hidden md:inline">Add Vehicle</span>
                                        </button>
                                    </>
                                )}
                                {isServiceClosed(selectedService.date) && (
                                    <span className="bg-gray-100 text-gray-500 font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
                                        Read Only
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Search Column */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ministry-orange" />
                                    <input
                                        className="w-full pl-10 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all font-mono uppercase placeholder:normal-case placeholder:font-sans"
                                        placeholder="Search Plate (e.g. UBA 123A) or Driver Name..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                {/* Search Results */}
                                {searchQuery && (
                                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                        {filteredVehicles.length > 0 ? filteredVehicles.map(v => (
                                            <div key={v.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-900 font-mono text-lg">{v.number_plate}</p>
                                                        {v.status === 'Checked In' && v.currentServiceId === selectedService.id && (
                                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">Checked In</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500">{v.driverName} • {v.driverContact}</p>
                                                </div>
                                                <div>
                                                    {!isServiceClosed(selectedService.date) && (
                                                        v.status === 'Checked In' && v.currentServiceId === selectedService.id ? (
                                                            <button
                                                                onClick={() => handleCheckOut(v.id)}
                                                                className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-700 font-bold text-sm transition-colors border border-gray-200"
                                                            >
                                                                <LogOut className="w-3 h-3" />
                                                                <span>Check Out</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleCheckIn(v.id)}
                                                                className="bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-green-600 transition-colors shadow-sm"
                                                            >
                                                                Check In
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-8 text-center">
                                                <p className="text-gray-500 mb-4">No vehicle found matching "{searchQuery}".</p>
                                                <button
                                                    onClick={() => {
                                                        setFormData({ ...initialFormState, number_plate: searchQuery.toUpperCase() }); // Pre-fill plate
                                                        setViewMode('register-new');
                                                    }}
                                                    className="bg-ministry-text text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800"
                                                >
                                                    Register New Vehicle
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Stats Column */}
                            <div className="space-y-4">
                                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                                        <Activity className="w-4 h-4 mr-2 text-ministry-orange" />
                                        Live Status
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100">
                                            <span className="text-sm text-gray-500">Checked In</span>
                                            <span className="font-bold text-xl text-green-600">{checkedInVehicles.length}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-200 p-4 rounded-xl max-h-[400px] overflow-y-auto">
                                    <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase">Recent Arrivals</h4>
                                    <div className="space-y-2">
                                        {checkedInVehicles.length === 0 && <p className="text-xs text-gray-400 italic">No arrivals yet.</p>}
                                        {checkedInVehicles.map(v => (
                                            <div key={v.id} className="text-sm border-l-2 border-green-500 pl-3 py-1">
                                                <div className="flex justify-between">
                                                    <span className="font-bold font-mono">{v.number_plate}</span>
                                                    <span className="text-xs text-gray-400">{v.checkInTime}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">{v.driverName}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- REGISTER NEW VEHICLE FORM (SERVICE CONTEXT) --- */}
                {viewMode === 'register-new' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                            <h2 className="text-xl font-bold text-ministry-text">Register & Check In</h2>
                        </div>

                        <form onSubmit={handleRegisterSubmit} className="space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-6 flex items-start space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-green-800">Automatic Action</p>
                                    <p className="text-xs text-green-700">This vehicle will be added to the database AND checked in to <strong>{selectedService?.title}</strong> immediately.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Number Plate</label>
                                    <NumberPlateInput
                                        required
                                        value={formData.number_plate}
                                        onChange={(val) => setFormData({ ...formData, number_plate: val })}
                                        placeholder="UBA 000X"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Driver Name</label>
                                        <input
                                            required
                                            value={formData.driverName}
                                            onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Driver Contact</label>
                                        <PhoneInput
                                            required
                                            value={formData.driverContact}
                                            onChange={(val) => setFormData({ ...formData, driverContact: val })}
                                            placeholder="700 000 000"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="w-full bg-ministry-text text-white py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg">
                                    Register & Check In
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* --- ADD VEHICLE (DATABASE ONLY) FORM --- */}
                {viewMode === 'add-vehicle-db' && (
                    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
                        <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                            <h2 className="text-xl font-bold text-ministry-text">Add to Database</h2>
                        </div>

                        <form onSubmit={handleAddDatabaseVehicle} className="space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Number Plate</label>
                                    <NumberPlateInput
                                        required
                                        value={formData.number_plate}
                                        onChange={(val) => setFormData({ ...formData, number_plate: val })}
                                        placeholder="UBA 000X"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Driver Name</label>
                                        <input
                                            required
                                            value={formData.driverName}
                                            onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Driver Contact</label>
                                        <input
                                            required
                                            value={formData.driverContact}
                                            onChange={e => setFormData({ ...formData, driverContact: validateContact(e.target.value) })}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"
                                            placeholder="256..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="w-full bg-ministry-text text-white py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg">
                                    Save to Database
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* --- BULK IMPORT FORM --- */}
                {viewMode === 'bulk-add' && (
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
                        <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                            <h2 className="text-xl font-bold text-ministry-text">Bulk Vehicle Import</h2>
                        </div>

                        <form onSubmit={handleBulkSubmit} className="space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                                <p className="text-sm font-bold text-blue-800">Format Instructions</p>
                                <p className="text-xs text-blue-700">Enter each vehicle on a new line in the format: <span className="font-mono bg-blue-100 px-1 rounded">Number Plate, Driver Name, Contact</span></p>
                                <p className="text-xs text-blue-600 mt-1 italic">Example: UBA 123A, John Doe, 256772123456</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Bulk Data (CSV style)</label>
                                <textarea
                                    required
                                    value={bulkText}
                                    onChange={e => setBulkText(e.target.value)}
                                    className="w-full p-4 h-64 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none font-mono text-sm"
                                    placeholder={`UBA 123A, John Doe, 256772123456\nUBB 456B, Jane Smith, 256700112233`}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="flex items-center space-x-2 bg-ministry-text text-white px-6 py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg">
                                    <Upload className="w-4 h-4" />
                                    <span>Import Vehicles</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* --- VEHICLE DATABASE TAB --- */}
                {activeTab === 'database' && viewMode === 'list' && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Vehicle Database</h3>
                                <p className="text-sm text-gray-500">Manage all registered personal vehicles</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setViewMode('bulk-add')}
                                    className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" /> Import CSV
                                </button>
                                <button
                                    onClick={() => setViewMode('add-vehicle-db')}
                                    className="px-4 py-2 bg-ministry-text text-white rounded-lg font-bold hover:bg-ministry-orange flex items-center gap-2 shadow-sm"
                                >
                                    <Plus className="w-4 h-4" /> Add Vehicle
                                </button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none font-mono uppercase"
                                placeholder="Search Database by Plate or Name..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Vehicle Table */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Plate Number</th>
                                        <th className="p-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Owner / Driver</th>
                                        <th className="p-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Contact</th>
                                        <th className="p-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                                        <th className="p-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Registered</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredVehicles.length > 0 ? filteredVehicles.map(v => (
                                        <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-mono font-bold text-gray-800">{v.number_plate}</td>
                                            <td className="p-4 text-gray-700">{v.driverName}</td>
                                            <td className="p-4 text-gray-500 font-mono text-sm">{v.driverContact}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${v.status === 'Checked In' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {v.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">{v.registeredDate}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-gray-400">
                                                No vehicles found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParkingDashboard;
