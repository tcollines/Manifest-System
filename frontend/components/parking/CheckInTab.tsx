import React, { useState } from 'react';
import { PersonalVehicle, MinistryEvent } from '../../types';
import { isServiceClosed, validatePlate } from '../../utils';
import { ParkingStore } from '../../database/parkingStore';
import { useNotification } from '../ui/NotificationSystem';
import NumberPlateInput from '../NumberPlateInput';
import PhoneInput from '../PhoneInput';
import {
    Calendar,
    Clock,
    Car,
    ArrowLeft,
    QrCode,
    Plus,
    Search,
    LogOut,
    Activity,
    CheckCircle
} from 'lucide-react';

type ViewMode = 'list' | 'service-active' | 'register-new' | 'add-vehicle-db' | 'bulk-add';

interface CheckInTabProps {
    services: MinistryEvent[];
    vehicles: PersonalVehicle[];
    setVehicles: React.Dispatch<React.SetStateAction<PersonalVehicle[]>>;
    filteredVehicles: PersonalVehicle[];
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    selectedService: MinistryEvent | null;
    setSelectedService: (service: MinistryEvent | null) => void;
}

export const CheckInTab: React.FC<CheckInTabProps> = ({
    services,
    vehicles,
    setVehicles,
    filteredVehicles,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    selectedService,
    setSelectedService
}) => {
    const { showToast } = useNotification();
    const initialFormState = {
        number_plate: '',
        driverName: '',
        driverContact: '256'
    };
    const [formData, setFormData] = useState(initialFormState);

    const checkedInVehicles = vehicles.filter(v => v.status === 'Checked In' && v.currentServiceId === selectedService?.id);

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
        setViewMode('list');
        setSelectedService(null);
        setSearchQuery('');
    };

    const handleCheckIn = async (vehicleId: string) => {
        if (!selectedService) return;
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (vehicle) {
            await ParkingStore.checkIn(vehicle.id, selectedService.id);
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
            await ParkingStore.checkOut(vehicle.id);
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
        if (!selectedService) return;

        const { valid, formatted } = validatePlate(formData.number_plate);
        if (!valid) {
            showToast(`Invalid Number Plate Format: "${formData.number_plate}".\\Allowed formats: UAA 123A or UA 123AA (e.g. UBA 123A)`, 'error');
            return;
        }

        const duplicate = vehicles.find(v => v.number_plate === formatted);
        if (duplicate) {
            showToast(`Error: Vehicle "${formatted}" already exists in the system.\\Please search for it and Check In.`, 'error');
            return;
        }

        const newVehicle: PersonalVehicle = {
            id: crypto.randomUUID(),
            number_plate: formatted,
            driverName: formData.driverName,
            driverContact: formData.driverContact,
            status: 'Absent',
            registeredDate: new Date().toISOString().split('T')[0],
            attendedServiceIds: []
        };

        await ParkingStore.add(newVehicle);
        await ParkingStore.checkIn(newVehicle.id, selectedService.id);

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

    const handleScanQR = () => {
        showToast("Scanning Interface Active... (Camera integration placeholder)", 'info');
    };

    return (
        <>
            {/* SERVICE LIST */}
            {viewMode === 'list' && (
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

            {/* ACTIVE SERVICE CHECK-IN */}
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
                                                    setFormData({ ...initialFormState, number_plate: searchQuery.toUpperCase() }); 
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

            {/* REGISTER NEW VEHICLE FORM */}
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
        </>
    );
};
