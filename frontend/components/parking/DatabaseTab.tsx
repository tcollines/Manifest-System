import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    const [searchParams, setSearchParams] = useSearchParams();
    const initialFormState = {
        number_plate: '',
        driverName: '',
        driverContact: '256'
    };
    const [formData, setFormData] = useState(initialFormState);
    const [bulkText, setBulkText] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const handleBack = () => {
        setViewMode('list');
        setFormData(initialFormState);
        setBulkText('');
        setSearchParams(prev => { prev.delete('view'); return prev; }, { replace: true });
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
            {viewMode === 'list' && (() => {
                const itemsPerPage = 50;
                const totalVehicles = filteredVehicles.length;
                const totalPages = Math.max(1, Math.ceil(totalVehicles / itemsPerPage));
                const paginatedVehicles = filteredVehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                return (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Vehicle Database</h3>
                            <p className="text-sm text-gray-500">Manage all registered personal vehicles</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={() => { setViewMode('add-vehicle-db'); setSearchParams(prev => { prev.set('view', 'add-vehicle'); return prev; }, { replace: true }); }}
                                className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="whitespace-nowrap">Add Vehicle</span>
                            </button>
                            <button
                                onClick={() => { setViewMode('bulk-add'); setSearchParams(prev => { prev.set('view', 'bulk'); return prev; }, { replace: true }); }}
                                className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium text-sm"
                            >
                                <Upload className="w-4 h-4" />
                                <span className="whitespace-nowrap">Import</span>
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ministry-orange transition-all"
                            placeholder="Search database..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm sticky top-0 z-10">
                        <div>
                            <span className="text-sm text-gray-600">Showing </span>
                            <span className="font-bold text-gray-900">
                                {totalVehicles > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalVehicles)}
                            </span>
                            <span className="text-sm text-gray-600"> of <span className="font-bold text-ministry-orange">{totalVehicles}</span> vehicles</span>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-gray-700 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-gray-700 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm max-h-[70vh]">
                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left relative">
                                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20 shadow-sm">
                                    <tr>
                                        <th className="p-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Plate Number</th>
                                        <th className="p-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Owner / Driver</th>
                                        <th className="p-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Contact</th>
                                        <th className="p-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                                        <th className="p-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Registered</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedVehicles.length > 0 ? paginatedVehicles.map(v => (
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
                        <div className="flex justify-center py-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
                        </div>
                    </div>

                    {/* Mobile Compact List */}
                    <div className="md:hidden bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-[65vh]">
                        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                            {paginatedVehicles.length > 0 ? paginatedVehicles.map(v => (
                                <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                                    {/* Plate badge */}
                                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                        <span className="text-[10px] font-bold text-gray-600 font-mono">{v.number_plate.slice(0, 2)}</span>
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 text-sm font-mono">{v.number_plate}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{v.driverName} • {v.driverContact}</p>
                                    </div>
                                    {/* Status */}
                                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${v.status === 'Checked In' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {v.status === 'Checked In' ? 'IN' : 'OUT'}
                                    </span>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-gray-400 text-sm">No vehicles found.</div>
                            )}
                        </div>
                        <div className="flex justify-center py-2.5 border-t border-gray-100">
                            <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
                        </div>
                    </div>
                </div>
                );
            })()}
        </>
    );
};
