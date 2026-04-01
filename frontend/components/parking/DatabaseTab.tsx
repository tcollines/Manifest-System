import React, { useState } from 'react';
import { PersonalVehicle } from '../../types';
import { validatePlate } from '../../utils';
import { ParkingStore } from '../../database/parkingStore';
import { useNotification } from '../ui/NotificationSystem';
import NumberPlateInput from '../NumberPlateInput';
import { ArrowLeft, Plus, Upload, Search } from 'lucide-react';

type ViewMode = 'list' | 'service-active' | 'register-new' | 'add-vehicle-db' | 'bulk-add';

interface DatabaseTabProps {
    vehicles: PersonalVehicle[];
    setVehicles: React.Dispatch<React.SetStateAction<PersonalVehicle[]>>;
    filteredVehicles: PersonalVehicle[];
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
}

export const DatabaseTab: React.FC<DatabaseTabProps> = ({
    vehicles,
    setVehicles,
    filteredVehicles,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode
}) => {
    const { showToast } = useNotification();
    const initialFormState = {
        number_plate: '',
        driverName: '',
        driverContact: '256'
    };
    const [formData, setFormData] = useState(initialFormState);
    const [bulkText, setBulkText] = useState('');

    const handleBack = () => {
        setViewMode('list');
        setFormData(initialFormState);
        setBulkText('');
    };

    const validateContact = (val: string) => {
        let digits = val.replace(/\\D/g, '');
        if (digits.length > 12) digits = digits.slice(0, 12);
        if (digits.length > 0 && !digits.startsWith('256')) {
            return '256';
        }
        return digits;
    };

    const handleAddDatabaseVehicle = async (e: React.FormEvent) => {
        e.preventDefault();

        const { valid, formatted } = validatePlate(formData.number_plate);
        if (!valid) {
            showToast(`Invalid Number Plate Format: "${formData.number_plate}".\\Allowed formats: UAA 123A or UA 123AA (e.g. UBA 123A)`, 'error');
            return;
        }

        const duplicate = vehicles.find(v => v.number_plate === formatted);
        if (duplicate) {
            showToast(`Error: Vehicle "${formatted}" already exists in the system.`, 'error');
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
        setVehicles([newVehicle, ...vehicles]);
        setFormData(initialFormState);
        setViewMode('list');
        showToast(`Vehicle ${newVehicle.number_plate} added to database.`, 'success');
    };

    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const lines = bulkText.split('\\n');
        const newVehicles: PersonalVehicle[] = [];
        let count = 0;

        lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 1) {
                const plate = parts[0].trim();
                const name = parts[1] ? parts[1].trim() : 'Unknown';
                const contact = parts[2] ? parts[2].trim() : '';

                if (plate) {
                    newVehicles.push({
                        id: crypto.randomUUID(),
                        number_plate: plate.toUpperCase(),
                        driverName: name,
                        driverContact: contact,
                        status: 'Absent',
                        registeredDate: new Date().toISOString().split('T')[0],
                        attendedServiceIds: []
                    });
                    count++;
                }
            }
        });

        if (count > 0) {
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

    return (
        <>
            {/* ADD VEHICLE (DATABASE ONLY) FORM */}
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

            {/* BULK IMPORT FORM */}
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

            {/* VEHICLE DATABASE TAB (LIST) */}
            {viewMode === 'list' && (
                <div className="space-y-6 border-transparent">
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
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${v.status === 'Checked In' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
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
        </>
    );
};
