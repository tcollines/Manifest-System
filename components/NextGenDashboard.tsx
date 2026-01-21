import React, { useState, useEffect } from 'react';
import { Child, MinistryEvent, ModalType } from '../types';
import * as XLSX from 'xlsx';
import { validateContact, isServiceClosed } from '../utils';
import { EventStore } from '../database/eventStore';
import { ChildStore } from '../database/childStore';
import { supabase } from '../services/supabaseClient';
import {
    Users,
    UserPlus,
    Search,
    Calendar,
    CheckCircle,
    XCircle,
    Baby,
    Clock,
    ArrowLeft,
    Activity,
    Phone,
    MapPin,
    Smile,
    LogOut,
    FileText,
    Upload
} from 'lucide-react';

interface NextGenDashboardProps {
    events?: MinistryEvent[];
    onOpenModal?: (type: ModalType) => void;
}

type Tab = 'checkin' | 'checkout' | 'database';
type ViewMode = 'list' | 'service-active' | 'add-child' | 'bulk-import';

const NextGenDashboard: React.FC<NextGenDashboardProps> = ({ events = [], onOpenModal }) => {
    const [activeTab, setActiveTab] = useState<Tab>('checkin');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [children, setChildren] = useState<Child[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedService, setSelectedService] = useState<MinistryEvent | null>(null);

    // Force re-render
    const [, forceUpdate] = useState(0);

    const refreshData = async () => {
        const data = await ChildStore.getAll();
        setChildren(data);
    };

    useEffect(() => {
        refreshData();

        const channel = supabase.channel('nextgen-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, () => {
                refreshData();
                forceUpdate(n => n + 1);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ministry_events' }, () => {
                window.location.reload();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // New Child Form State
    const initialForm = {
        name: '',
        parentName: '',
        parentContact: '', // numbers only, max 12 digits
        age: '',
        gender: 'Male',
        residence: ''
    };
    const [formData, setFormData] = useState(initialForm);
    const [bulkText, setBulkText] = useState('');

    const filteredChildren = children.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.parentContact.includes(searchQuery);

        // If in checkout mode, only show children who are currently checked in (using attendedServiceIds if service selected)
        if (activeTab === 'checkout' && viewMode === 'service-active' && selectedService) {
            return matchesSearch && (c.status === 'Checked In' || c.attendedServiceIds.includes(selectedService.id));
        }

        return matchesSearch;
    });

    const services = events.filter(e => e.type === 'Service').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // --- Handlers ---

    const handleOpenService = (service: MinistryEvent) => {
        setSelectedService(service);
        setViewMode('service-active');
    };

    const handleBack = () => {
        setViewMode('list');
        setSelectedService(null);
        setSearchQuery('');
        setFormData(initialForm);
        setBulkText('');
    };

    const handleCheckIn = async (childId: string) => {
        if (!selectedService) return;

        const child = children.find(c => c.id === childId);
        if (!child) return;

        const updatedChild: Child = {
            ...child,
            status: 'Checked In',
            checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            checkOutTime: undefined,
            attendedServiceIds: [...child.attendedServiceIds, selectedService.id]
        };

        // Optimistic UI update
        setChildren(prev => prev.map(c => c.id === childId ? updatedChild : c));

        // DB Update
        await ChildStore.update(updatedChild);
    };

    const handleCheckOut = async (childId: string) => {
        if (!selectedService) return;

        const child = children.find(c => c.id === childId);
        if (!child) return;

        const updatedChild: Child = {
            ...child,
            status: 'Checked Out',
            checkOutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Optimistic UI update
        setChildren(prev => prev.map(c => c.id === childId ? updatedChild : c));

        // DB Update
        await ChildStore.update(updatedChild);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'parentContact') {
            setFormData({ ...formData, [name]: validateContact(value) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleAddChild = async (e: React.FormEvent) => {
        e.preventDefault();
        const isServiceActive = viewMode === 'service-active';

        const newChild: Child = {
            id: `c-${Date.now()}`,
            name: formData.name,
            parentName: formData.parentName,
            parentContact: formData.parentContact, // numbers only, max 12 digits
            age: parseInt(formData.age) || 0,
            gender: formData.gender as 'Male' | 'Female',
            residence: formData.residence,
            status: isServiceActive ? 'Checked In' : 'Absent',
            checkInTime: isServiceActive ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            joinedDate: new Date().toISOString().split('T')[0],
            attendedServiceIds: isServiceActive && selectedService ? [selectedService.id] : []
        };

        // Save to DB first
        await ChildStore.add(newChild);

        setChildren([newChild, ...children]);
        setFormData(initialForm);

        if (isServiceActive) {
            alert(`${newChild.name} registered and checked in successfully!`);
            // Stay in service view
        } else {
            alert(`${newChild.name} added to Next Gen database.`);
            setViewMode('list');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            // Convert to tab-separated string
            // Order: Child Name, Gender, Age, Residence, Parent Name, Contact
            let text = '';
            jsonData.forEach((row, index) => {
                // Skip header if detected 
                if (index === 0 && typeof row[0] === 'string' && row[0].toLowerCase().includes('name')) return;

                const name = row[0] || '';
                const gender = row[1] || 'Male';
                const age = row[2] || '';
                const residence = row[3] || '';
                const parentName = row[4] || '';
                const parentContact = row[5] || '';

                if (name) {
                    text += `${name}\t${gender}\t${age}\t${residence}\t${parentName}\t${parentContact}\n`;
                }
            });
            setBulkText(text);
        } else {
            // Fallback for CSV/Text
            const reader = new FileReader();
            reader.onload = (evt) => {
                const text = evt.target?.result as string;
                setBulkText(text);
            };
            reader.readAsText(file);
        }
    };



    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const lines = bulkText.split('\n');
        const newChildren: Child[] = [];
        let count = 0;

        lines.forEach(line => {
            if (!line.trim()) return;

            // Support Excel (Tab) or CSV (Comma)
            const delimiter = line.includes('\t') ? '\t' : ',';
            const parts = line.split(delimiter);

            // Expected Format: Name, Gender, Age, Residence, Parent Name, Parent Contact
            if (parts.length >= 6) {
                const name = parts[0].trim();
                const gender = parts[1].trim();
                const age = parseInt(parts[2].trim()) || 0;
                const residence = parts[3].trim();
                const parentName = parts[4].trim();
                const parentContact = parts[5].trim();

                if (name && parentName) {
                    newChildren.push({
                        id: `c-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        name,
                        age,
                        gender: gender.toLowerCase().startsWith('f') ? 'Female' : 'Male',
                        parentName,
                        parentContact,
                        residence,
                        status: 'Absent',
                        joinedDate: new Date().toISOString().split('T')[0],
                        attendedServiceIds: []
                    });
                    count++;
                }
            }
        });

        if (count > 0) {
            await ChildStore.bulkAdd(newChildren);
            setChildren([...newChildren, ...children]);
            setBulkText('');
            setViewMode('list');
            alert(`${count} children profiles imported successfully.`);
        } else {
            alert("No valid data found. Ensure format matches instructions.");
        }
    };

    // --- Render ---

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-ministry-text flex items-center gap-3">
                        <Baby className="w-8 h-8 text-ministry-orange" />
                        Next Gen Ministry
                    </h1>
                    <p className="text-gray-500">Manage children, parents, and service check-ins.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            {viewMode === 'list' && (
                <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('checkin')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'checkin'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <CheckCircle className={`w-4 h-4 ${activeTab === 'checkin' ? 'text-ministry-neon' : ''}`} />
                        <span>Check-In</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('checkout')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'checkout'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <LogOut className={`w-4 h-4 ${activeTab === 'checkout' ? 'text-ministry-neon' : ''}`} />
                        <span>Check-Out</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('database')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'database'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <Users className={`w-4 h-4 ${activeTab === 'database' ? 'text-ministry-neon' : ''}`} />
                        <span>Database</span>
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className="bg-ministry-card border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px]">

                {/* --- SERVICE LIST (Shared for Check-In and Check-Out) --- */}
                {(activeTab === 'checkin' || activeTab === 'checkout') && viewMode === 'list' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">
                                {activeTab === 'checkin' ? 'Select Service for Check-In' : 'Select Service for Check-Out'}
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {services.map(service => {
                                const serviceDate = new Date(service.date);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                serviceDate.setHours(0, 0, 0, 0);
                                const isPast = serviceDate < today;

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
                                        {isServiceClosed(service.date) ? (
                                            <button
                                                onClick={() => handleOpenService(service)}
                                                className="w-full text-gray-600 bg-gray-100 py-2.5 rounded-lg font-bold flex items-center justify-center transition-colors hover:bg-gray-200"
                                            >
                                                <Activity className="w-4 h-4 mr-2" /> View Highlights
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenService(service)}
                                                className={`w-full text-white py-2.5 rounded-lg font-bold flex items-center justify-center transition-colors ${activeTab === 'checkout' ? 'bg-gray-800 hover:bg-gray-900' : 'bg-ministry-text hover:bg-ministry-orange'}`}
                                            >
                                                {activeTab === 'checkout' ? (
                                                    <><LogOut className="w-4 h-4 mr-2" /> Manage Check-Out</>
                                                ) : (
                                                    <><CheckCircle className="w-4 h-4 mr-2" /> Manage Check-In</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- DATABASE TAB --- */}
                {activeTab === 'database' && viewMode === 'list' && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="text-lg font-bold text-gray-800">Children's Database</h3>
                            <div className="flex space-x-3 w-full md:w-auto">
                                <button
                                    onClick={() => setViewMode('add-child')}
                                    className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span>Add Child</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('bulk-import')}
                                    className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>Bulk Import</span>
                                </button>
                            </div>
                        </div>

                        <div className="relative group max-w-lg">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all"
                                placeholder="Search by Child, Parent, or Contact..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="overflow-x-auto border border-gray-200 rounded-xl">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Child Name</th>
                                        <th className="px-6 py-4">Age / Gender</th>
                                        <th className="px-6 py-4">Parent</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {filteredChildren.length > 0 ? filteredChildren.map(c => (
                                        <tr key={c.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{c.age} yrs • {c.gender}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{c.parentName}</td>
                                            <td className="px-6 py-4 text-sm font-mono text-gray-500">{c.parentContact}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'Checked In' ? 'bg-green-100 text-green-700' :
                                                    c.status === 'Checked Out' ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">No records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- ACTIVE SERVICE CHECK-IN/OUT VIEW --- */}
                {viewMode === 'service-active' && selectedService && (
                    <div className="space-y-6">

                        {/* --- SERVICE VIEW (ACTIVE) --- */}
                        {isServiceClosed(selectedService.date) ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                    <div className="flex items-center space-x-3">
                                        <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                                        </button>
                                        <div>
                                            <h2 className="text-xl font-bold text-ministry-text">{selectedService.title}</h2>
                                            <p className="text-sm text-gray-500">
                                                Service Highlights • {selectedService.date}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold text-sm">
                                        Read Only
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center">
                                        <h4 className="text-gray-500 font-bold uppercase text-xs mb-2">Total Children</h4>
                                        <p className="text-3xl font-black text-ministry-text">
                                            {children.filter(c => c.attendedServiceIds.includes(selectedService.id)).length}
                                        </p>
                                    </div>
                                    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center">
                                        <h4 className="text-gray-500 font-bold uppercase text-xs mb-2">First Timers</h4>
                                        <p className="text-3xl font-black text-ministry-orange">
                                            {children.filter(c => c.attendedServiceIds.includes(selectedService.id) && c.joinedDate === selectedService.date).length}
                                        </p>
                                    </div>
                                    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center">
                                        <h4 className="text-gray-500 font-bold uppercase text-xs mb-2">Registered</h4>
                                        <p className="text-3xl font-black text-blue-600">
                                            {children.filter(c => c.attendedServiceIds.includes(selectedService.id)).length}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl text-center text-blue-800 text-sm">
                                    This service is closed. You can only view high-level stats and list of attendees.
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                    <div className="flex items-center space-x-3">
                                        <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                                        </button>
                                        <div>
                                            <h2 className="text-xl font-bold text-ministry-text">{selectedService.title}</h2>
                                            <p className="text-sm text-gray-500">
                                                {activeTab === 'checkout' ? 'Kids Check-Out' : 'Kids Check-In'} • {selectedService.date}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Hide Register button in Check-Out mode */}
                                    <div className="flex space-x-2">
                                        {activeTab === 'checkin' && (
                                            <>

                                                <button
                                                    onClick={() => setViewMode('add-child')}
                                                    className="flex items-center space-x-2 bg-ministry-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 shadow-md"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    <span className="hidden md:inline">Register New</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Search & List */}
                                <div className="max-w-xl mx-auto space-y-4">
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ministry-orange" />
                                        <input
                                            className="w-full pl-10 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all"
                                            placeholder={activeTab === 'checkout' ? "Search Checked-In Children..." : "Search Child, Parent..."}
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    {searchQuery && (
                                        <div className="bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                            {filteredChildren.map(c => (
                                                <div key={c.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{c.name}</p>
                                                        <p className="text-xs text-gray-500">{c.age} yrs • Parent: {c.parentName}</p>
                                                    </div>
                                                    <div>
                                                        {(c.status === 'Checked In' || (selectedService && c.attendedServiceIds.includes(selectedService.id) && c.status !== 'Checked Out')) ? (
                                                            <div className="flex items-center space-x-3">
                                                                <span className="text-green-600 font-bold text-sm flex items-center"><Clock className="w-3 h-3 mr-1" /> {c.checkInTime || 'Active'}</span>
                                                                <button
                                                                    onClick={() => handleCheckOut(c.id)}
                                                                    className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-700 font-bold text-sm transition-colors border border-gray-200"
                                                                >
                                                                    <LogOut className="w-3 h-3" />
                                                                    <span>Check Out</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* Only show Check In button if we are in Check In tab */}
                                                                {activeTab === 'checkin' && (
                                                                    <button
                                                                        onClick={() => handleCheckIn(c.id)}
                                                                        className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-200 transition-colors"
                                                                    >
                                                                        Check In
                                                                    </button>
                                                                )}
                                                                {activeTab === 'checkout' && (
                                                                    <span className="text-xs text-gray-400 italic">Not Checked In</span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredChildren.length === 0 && (
                                                <div className="p-4 text-center text-gray-500">
                                                    {activeTab === 'checkout'
                                                        ? "No checked-in children found matching search."
                                                        : (
                                                            <>
                                                                No child found. <button onClick={() => setViewMode('add-child')} className="text-ministry-orange font-bold hover:underline">Register New?</button>
                                                            </>
                                                        )
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Recent Check-Ins */}
                                <div className="mt-8 pt-8 border-t border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-4">
                                        Recently Checked In
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {children.filter(c => selectedService && c.attendedServiceIds.includes(selectedService.id)).slice(0, 6).map(c => (
                                            <div key={c.id} className="bg-green-50 border border-green-100 p-4 rounded-xl flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-green-900">{c.name}</p>
                                                    <p className="text-xs text-green-700">Checked in at {c.checkInTime || 'Recently'}</p>
                                                </div>
                                                <Smile className="w-5 h-5 text-green-500" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ADD CHILD FORM --- */}
                {viewMode === 'add-child' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                            <h2 className="text-xl font-bold text-ministry-text">
                                {activeTab === 'checkin' ? 'Register & Check-In' : 'Add New Profile'}
                            </h2>
                        </div>

                        <form onSubmit={handleAddChild} className="space-y-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Child's Name</label>
                                        <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="Full Name" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Age</label>
                                        <input required name="age" type="number" value={formData.age} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="Years" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none">
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                                    <h4 className="font-bold text-gray-800 text-sm flex items-center"><Users className="w-4 h-4 mr-2" /> Parent / Guardian Info</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Parent Name</label>
                                            <input required name="parentName" value={formData.parentName} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="Full Name" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Contact</label>
                                            <input required name="parentContact" value={formData.parentContact} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="256..." />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Residence</label>
                                        <input required name="residence" value={formData.residence} onChange={handleInputChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="e.g. Entebbe, Kitoro" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="px-8 py-3 bg-ministry-text text-white rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg w-full md:w-auto">
                                    {activeTab === 'checkin' ? 'Register & Check In' : 'Save to Database'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* --- BULK IMPORT FORM --- */}
                {viewMode === 'bulk-import' && (
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
                        <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                            <h2 className="text-xl font-bold text-ministry-text">Bulk Children Import</h2>
                        </div>

                        <form onSubmit={handleBulkSubmit} className="space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                                <p className="text-sm font-bold text-blue-800">Instructions</p>
                                <p className="text-xs text-blue-700 mt-1">
                                    Upload an Excel file or paste data.
                                </p>
                                <p className="text-xs text-blue-700 mt-1">
                                    Format: <span className="font-mono bg-blue-100 px-1 rounded">Name | Gender | Age | Residence | Parent Name | Contact</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Upload Excel File</label>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ministry-orange file:text-white hover:file:bg-orange-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Or Paste Data (CSV / Excel Copy)</label>
                                <textarea
                                    required
                                    value={bulkText}
                                    onChange={e => setBulkText(e.target.value)}
                                    className="w-full p-4 h-64 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none font-mono text-sm whitespace-pre"
                                    placeholder={`Timothy Jr\tMale\t5\tEntebbe\tTim Senior\t256700111222\nSarah Joy\tFemale\t8\tKitoro\tMary Joy\t256700333444`}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="flex items-center space-x-2 bg-ministry-text text-white px-6 py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg">
                                    <Upload className="w-4 h-4" />
                                    <span>Import Children</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            </div>
        </div>
    );
};

export default NextGenDashboard;
