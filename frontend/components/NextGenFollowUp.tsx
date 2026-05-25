import React, { useState, useEffect } from 'react';
import { User, MinistryEvent, Child, Member } from '../types';
import { ChildStore } from '../database/childStore';
import { UserStore } from '../database/userStore';
import { NextGenSoulsStore, NextGenSoul } from '../database/nextGenSoulsStore';
import { MemberStore } from '../database/memberStore';
import { EventStore } from '../database/eventStore';
import { Search, Phone, MessageSquare, CheckCircle, UserPlus, AlertCircle, Calendar, Clock, Download, AlertTriangle, Users, Database, Plus, ChevronDown, Check, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DEPARTMENTS } from '../constants/departments';
import { useNotification } from './ui/NotificationSystem';
import ConfirmationModal from './ConfirmationModal';

interface NextGenFollowUpProps {
    currentUser?: User | null;
    events?: MinistryEvent[];
}

type Tab = 'first-timers' | 'absentees' | 'action-items' | 'souls-won';

const NextGenFollowUp: React.FC<NextGenFollowUpProps> = ({ currentUser, events }) => {
    const { showToast } = useNotification();
    const [activeTab, setActiveTab] = useState<Tab>('first-timers');
    const [children, setChildren] = useState<Child[]>([]);
    const [volunteers, setVolunteers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Called' | 'Message Sent' | 'Visited'>('All');

    // Souls Won State
    const [souls, setSouls] = useState<NextGenSoul[]>([]);
    const [services, setServices] = useState<MinistryEvent[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [soulsSearchQuery, setSoulsSearchQuery] = useState('');
    const [childSearchResults, setChildSearchResults] = useState<Child[]>([]);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [soulToDelete, setSoulToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [allChildren, allUsersResponse, allSouls, allEventsResponse] = await Promise.all([
                ChildStore.getAll(),
                UserStore.getAll(),
                NextGenSoulsStore.getAll(),
                EventStore.getAll()
            ]);

            const users = allUsersResponse.status === 'success' && allUsersResponse.data ? allUsersResponse.data : [];
            setSouls(allSouls || []);

            // Filter only Services
            const allServices = allEventsResponse.status === 'success' && allEventsResponse.data
                ? allEventsResponse.data.filter(e => e.type === 'Service').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                : [];
            setServices(allServices);
            if (allServices.length > 0 && !selectedServiceId) {
                setSelectedServiceId(allServices[0].id);
            }

            setChildren(allChildren);
            setVolunteers(users);

            // Filter users: either explicitly in Next Gen department OR has Next Gen in role
            const nextGenDeptId = DEPARTMENTS.find(d => d.name === 'Next Gen')?.id;

            const nextGenVolunteers = users.filter(u =>
                (nextGenDeptId && u.departmentId === nextGenDeptId) ||
                (u.role && u.role.toLowerCase().includes('next gen')) ||
                // Fallback: If no users found, show all (or filtered admins)
                (u.role === 'Super Admin')
            );

            if (nextGenVolunteers.length > 0) {
                setVolunteers(nextGenVolunteers);
            } else {
                console.warn("No Next Gen volunteers found, showing all users.");
                setVolunteers(users);
            }
        } catch (error) {
            console.error("Failed to load follow up data", error);
            showToast("Failed to load data", 'error');
        } finally {
            setLoading(false);
        }
    };

    // Search Local Children Data
    useEffect(() => {
        if (soulsSearchQuery.length < 2) {
            setChildSearchResults([]);
            return;
        }

        const results = children.filter(c =>
            (c.name && c.name.toLowerCase().includes(soulsSearchQuery.toLowerCase())) ||
            (c.parentContact && c.parentContact.includes(soulsSearchQuery))
        ).slice(0, 10);

        setChildSearchResults(results);
    }, [soulsSearchQuery, children]);

    const handleDeleteSoul = (soulId: string) => {
        setSoulToDelete(soulId);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteSoul = async () => {
        if (!soulToDelete) return;

        try {
            await NextGenSoulsStore.delete(soulToDelete);
            showToast("Soul deleted successfully", 'success');
            const updatedSouls = await NextGenSoulsStore.getAll();
            setSouls(updatedSouls);
        } catch (error) {
            console.error("Failed to delete soul", error);
            showToast("Failed to delete soul", 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setSoulToDelete(null);
        }
    };

    const handleAddSoul = async (child: Child) => {
        if (!selectedServiceId) {
            showToast("Please select a service first", 'error');
            return;
        }

        try {
            const newSoul: Omit<NextGenSoul, 'id' | 'createdAt'> = {
                firstName: child.name.split(' ')[0],
                lastName: child.name.split(' ').slice(1).join(' '),
                phone: child.parentContact,
                age: child.age || 0,
                gender: child.gender,
                residence: child.residence,
                serviceId: selectedServiceId,
                status: 'New',
                capturedBy: currentUser?.name || 'System',
                notes: `Added from Next Gen Database. Parent: ${child.parentName}`
            };

            await NextGenSoulsStore.add(newSoul);
            showToast("Soul added successfully", 'success');

            // Refresh data
            const updatedSouls = await NextGenSoulsStore.getAll();
            setSouls(updatedSouls);
            setSoulsSearchQuery('');
        } catch (error) {
            console.error("Failed to add soul", error);
            showToast("Failed to add soul", 'error');
        }
    };

    const [absenceReason, setAbsenceReason] = useState('');
    const [selectedChildForReason, setSelectedChildForReason] = useState<string | null>(null);

    const handleUpdateStatus = async (child: Child, status: 'Pending' | 'Called' | 'Message Sent' | 'Visited', reason?: string) => {
        try {
            const updatedChild: Child = {
                ...child,
                followUpStatus: status,
                ...(reason ? { absenceReason: reason } : {}) // Only update reason if provided
            };
            await ChildStore.update(updatedChild);
            setChildren(prev => prev.map(c => c.id === child.id ? updatedChild : c));
            showToast(`Status updated to ${status}`, 'success');
            setAbsenceReason('');
            setSelectedChildForReason(null);
        } catch (error) {
            showToast("Failed to update status", 'error');
        }
    };

    const handleAssignVolunteer = async (child: Child, volunteerId: string) => {
        try {
            const updatedChild = { ...child, assignedTo: volunteerId };
            await ChildStore.update(updatedChild);
            setChildren(prev => prev.map(c => c.id === child.id ? updatedChild : c));
            showToast("Volunteer assigned", 'success');
        } catch (error) {
            showToast("Failed to assign volunteer", 'error');
        }
    };

    // Filter Logic
    const firstTimers = children.filter(c => c.category === 'First Timer');

    // Simple logic for absentees: status is Absent. 
    // Ideally we check attendance history, but for MVP we use current status or manual absent flag
    const absentees = children.filter(c => c.status === 'Absent' && c.category !== 'First Timer');

    const filteredFirstTimers = firstTimers
        .filter(c => c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(c => statusFilter === 'All' || c.followUpStatus === statusFilter || (!c.followUpStatus && statusFilter === 'Pending'));

    const filteredAbsentees = absentees
        .filter(c => c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(c => statusFilter === 'All' || c.followUpStatus === statusFilter || (!c.followUpStatus && statusFilter === 'Pending'));

    const renderStatusBadge = (status?: string) => {
        switch (status) {
            case 'Called': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold flex items-center"><Phone className="w-3 h-3 mr-1" /> Called</span>;
            case 'Message Sent': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold flex items-center"><MessageSquare className="w-3 h-3 mr-1" /> Msg Sent</span>;
            case 'Visited': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Visited</span>;
            default: return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold flex items-center"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
        }
    };

    const calculateMissedDuration = (lastCheckIn?: string) => {
        if (!lastCheckIn) return 'Unknown';
        const diff = new Date().getTime() - new Date(lastCheckIn).getTime();
        const days = Math.floor(diff / (1000 * 3600 * 24));

        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return `${Math.floor(days / 30)} months ago`;
    };

    const getAbsenceSeverity = (lastCheckIn?: string): 'normal' | 'warning' | 'critical' => {
        if (!lastCheckIn) return 'critical'; // No record = critical
        const diff = new Date().getTime() - new Date(lastCheckIn).getTime();
        const days = Math.floor(diff / (1000 * 3600 * 24));

        if (days >= 30) return 'critical';
        if (days >= 14) return 'warning';
        return 'normal';
    };

    const handleExportAbsentees = () => {
        const data = filteredAbsentees.map(c => ({
            Name: c.name,
            Parent: c.parentName,
            Contact: c.parentContact,
            'Last Check-In': c.checkInTime ? new Date(c.checkInTime).toLocaleDateString() : 'N/A',
            'Duration': calculateMissedDuration(c.checkInTime),
            'Status': c.followUpStatus || 'Pending',
            'Assigned To': c.assignedTo || 'Unassigned'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Absentees");
        XLSX.writeFile(wb, "NextGen_Absentees_Report.xlsx");
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-ministry-text">Next Gen Follow Up</h1>
                    <p className="text-gray-500 mt-1">Track first-timers, absentees, and pastoral care.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    {(['souls-won', 'first-timers', 'absentees', 'action-items'] as Tab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setSearchQuery('');
                                setStatusFilter('All');
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-white shadow text-ministry-text' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.replace('-', ' ')}
                        </button>
                    ))}
                </div>
            </header>

            {/* SOULS WON VIEW */}
            {activeTab === 'souls-won' && (
                <div className="space-y-6">
                    {/* Controls: Service Selector & Search */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4 md:space-y-0 md:flex md:justify-between md:items-start md:gap-4">
                        <div className="w-full md:w-1/3">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select Service</label>
                            <div className="relative">
                                <select
                                    value={selectedServiceId}
                                    onChange={(e) => setSelectedServiceId(e.target.value)}
                                    className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-ministry-orange focus:border-ministry-orange block p-2.5 pr-8 font-bold"
                                >
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.title} ({s.date})
                                        </option>
                                    ))}
                                    {services.length === 0 && <option value="">No services found</option>}
                                </select>
                                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                        </div>

                        <div className="w-full md:w-2/3 relative group z-20">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Add Soul from Next Gen Database</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search child name or parent contact..."
                                    value={soulsSearchQuery}
                                    onChange={(e) => setSoulsSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all"
                                />
                            </div>

                            {/* Dropdown Results */}
                            {soulsSearchQuery.length > 1 && childSearchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                                        {childSearchResults.map(child => (
                                            <div key={child.id} className="p-3 hover:bg-gray-50 flex justify-between items-center transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-800">{child.name}</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500">Parent: {child.parentName} ({child.parentContact})</p>
                                                </div>
                                                <div>
                                                    {/* Check if soul exists for THIS service */}
                                                    {souls.some(s => s.serviceId === selectedServiceId && (
                                                        (s.phone && child.parentContact && s.phone === child.parentContact) ||
                                                        (s.firstName + ' ' + s.lastName === child.name)
                                                    )) ? (
                                                        <span className="text-xs font-bold text-gray-400 flex items-center bg-gray-100 px-2 py-1 rounded">
                                                            <Check className="w-3 h-3 mr-1" /> Added
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAddSoul(child)}
                                                            className="text-xs bg-ministry-orange text-white px-3 py-1.5 rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-sm flex items-center"
                                                        >
                                                            <Plus className="w-3 h-3 mr-1" /> Add
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Souls List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Souls Won in Selected Service</h3>
                            <span className="bg-white px-2 py-1 rounded border border-gray-200 text-xs font-bold text-gray-500">
                                {souls.filter(s => s.serviceId === selectedServiceId).length} Total
                            </span>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white text-gray-500 font-bold border-b border-gray-100 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Contact</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Captured By</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {souls.filter(s => s.serviceId === selectedServiceId).map(soul => (
                                    <tr key={soul.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-bold text-gray-900">{soul.firstName} {soul.lastName}</td>
                                        <td className="px-6 py-3 text-gray-600 font-mono">{soul.phone}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${soul.status === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                {soul.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 text-xs">{soul.capturedBy}</td>
                                        <td className="px-6 py-3 text-right">
                                            {currentUser?.role !== 'Staff' && currentUser?.role !== 'Member' && (
                                                <button
                                                    onClick={() => handleDeleteSoul(soul.id)}
                                                    className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {souls.filter(s => s.serviceId === selectedServiceId).length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                                            No Next Gen souls recorded for this service. Search and add above.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* FIRST TIMERS VIEW */}
            {activeTab === 'first-timers' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search first timers..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ministry-orange"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e: any) => setStatusFilter(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-ministry-orange focus:border-ministry-orange block p-2 ml-4"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Called">Called</option>
                            <option value="Message Sent">Message Sent</option>
                            <option value="Visited">Visited</option>
                        </select>
                        <div className="text-sm font-bold text-gray-500 ml-4">
                            Total: {filteredFirstTimers.length}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden md:hidden">
                        {/* Mobile View (Cards) */}
                        <div className="divide-y divide-gray-100">
                            {filteredFirstTimers.map(child => (
                                <div key={child.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-900">{child.name}</h3>
                                            <p className="text-xs text-gray-500">Parent: {child.parentName}</p>
                                        </div>
                                        {renderStatusBadge(child.followUpStatus)}
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <a href={`tel:${child.parentContact}`} className="flex items-center gap-1 hover:text-ministry-orange">
                                            <Phone size={14} /> {child.parentContact}
                                        </a>
                                        <span className="text-xs text-gray-400">Joined: {child.joinedDate}</span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 gap-3">
                                        <div className="flex-1">
                                            <select
                                                className="w-full bg-gray-50 text-gray-600 text-xs border border-gray-200 rounded p-2"
                                                value={child.assignedTo || ''}
                                                onChange={(e) => handleAssignVolunteer(child, e.target.value)}
                                            >
                                                <option value="">Unassigned</option>
                                                {volunteers.map(v => (
                                                    <option key={v.id} value={v.name}>{v.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex space-x-1">
                                            <button onClick={() => handleUpdateStatus(child, 'Called')} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Phone size={16} /></button>
                                            <button onClick={() => handleUpdateStatus(child, 'Message Sent')} className="p-2 bg-purple-50 text-purple-600 rounded-lg"><MessageSquare size={16} /></button>
                                            <button onClick={() => handleUpdateStatus(child, 'Visited')} className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredFirstTimers.length === 0 && (
                                <div className="p-8 text-center text-gray-400 italic">No first timers found.</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hidden md:block">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Child / Parent</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Joined Date</th>
                                    <th className="px-6 py-4">Current Status</th>
                                    <th className="px-6 py-4">Assigned To</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {filteredFirstTimers.map(child => (
                                    <tr key={child.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{child.name}</div>
                                            <div className="text-xs text-gray-500">Parent: {child.parentName}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">{child.parentContact}</td>
                                        <td className="px-6 py-4 text-gray-600">{child.joinedDate}</td>
                                        <td className="px-6 py-4">
                                            {renderStatusBadge(child.followUpStatus)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                className="bg-transparent text-gray-600 text-xs border-none focus:ring-0 cursor-pointer hover:text-ministry-orange"
                                                value={child.assignedTo || ''}
                                                onChange={(e) => handleAssignVolunteer(child, e.target.value)}
                                            >
                                                <option value="">Unassigned</option>
                                                {volunteers.map(v => (
                                                    <option key={v.id} value={v.name}>{v.name}</option> // Storing name for simplicity in display, ideally ID
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <button onClick={() => handleUpdateStatus(child, 'Called')} title="Mark Called" className="p-2 hover:bg-blue-100 rounded-full text-blue-600"><Phone size={16} /></button>
                                                <button onClick={() => handleUpdateStatus(child, 'Message Sent')} title="Mark Message Sent" className="p-2 hover:bg-purple-100 rounded-full text-purple-600"><MessageSquare size={16} /></button>
                                                <button onClick={() => handleUpdateStatus(child, 'Visited')} title="Mark Visited" className="p-2 hover:bg-green-100 rounded-full text-green-600"><CheckCircle size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredFirstTimers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                            No first timers found to follow up.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ABSENTEES VIEW */}
            {activeTab === 'absentees' && (
                <div className="space-y-6">


                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search absentees..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ministry-orange"
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            <select
                                value={statusFilter}
                                onChange={(e: any) => setStatusFilter(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-ministry-orange focus:border-ministry-orange block p-2"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Called">Called</option>
                                <option value="Message Sent">Message Sent</option>
                                <option value="Visited">Visited</option>
                            </select>
                            <button
                                onClick={handleExportAbsentees}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-bold transition-colors text-xs uppercase"
                            >
                                <Download size={14} />
                                <span>Export Excel</span>
                            </button>
                        </div>
                        <div className="text-sm font-bold text-gray-500 ml-4 hidden md:block">
                            Total: {filteredAbsentees.length}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden md:hidden">
                        {/* Mobile View (Cards) for Absentees */}
                        <div className="divide-y divide-gray-100">
                            {filteredAbsentees.map(child => (
                                <div key={child.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-900 flex items-center">
                                                {child.name}
                                                {getAbsenceSeverity(child.checkInTime) === 'critical' && <AlertTriangle className="w-4 h-4 text-red-500 ml-2" />}
                                                {getAbsenceSeverity(child.checkInTime) === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 ml-2" />}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                Last Seen: {child.checkInTime ? new Date(child.checkInTime).toLocaleDateString() : 'N/A'}
                                                <span className="text-red-500 font-bold ml-1">({calculateMissedDuration(child.checkInTime)})</span>
                                            </p>
                                        </div>
                                        {renderStatusBadge(child.followUpStatus)}
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <a href={`tel:${child.parentContact}`} className="flex items-center gap-1 hover:text-ministry-orange">
                                            <Phone size={14} /> {child.parentContact}
                                        </a>
                                        <span className="text-xs text-gray-400">Parent: {child.parentName}</span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 gap-3">
                                        <div className="flex-1">
                                            <select
                                                className="w-full bg-gray-50 text-gray-600 text-xs border border-gray-200 rounded p-2"
                                                value={child.assignedTo || ''}
                                                onChange={(e) => handleAssignVolunteer(child, e.target.value)}
                                            >
                                                <option value="">Unassigned</option>
                                                {volunteers.map(v => (
                                                    <option key={v.id} value={v.name}>{v.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex space-x-1">
                                            <button onClick={() => handleUpdateStatus(child, 'Called')} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Phone size={16} /></button>
                                            <button onClick={() => handleUpdateStatus(child, 'Message Sent')} className="p-2 bg-purple-50 text-purple-600 rounded-lg"><MessageSquare size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredAbsentees.length === 0 && (
                                <div className="p-8 text-center text-gray-400 italic">No absentees found.</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hidden md:block">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Child / Parent</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Last Check-In</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Assigned To</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {filteredAbsentees.map(child => (
                                    <tr key={child.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{child.name}</div>
                                            <div className="text-xs text-gray-500">Parent: {child.parentName}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">{child.parentContact}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {child.checkInTime ? new Date(child.checkInTime).toLocaleDateString() : 'N/A'}
                                            {child.checkInTime && (
                                                <div className="text-xs text-red-500 font-bold mt-1">
                                                    Missed: {calculateMissedDuration(child.checkInTime)}
                                                </div>
                                            )}
                                            {child.absenceReason && (
                                                <div className="text-xs text-gray-500 mt-1 italic">
                                                    Reason: {child.absenceReason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                {renderStatusBadge(child.followUpStatus)}
                                                {getAbsenceSeverity(child.checkInTime) === 'critical' && (
                                                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full border border-red-200">Crit.</span>
                                                )}
                                                {getAbsenceSeverity(child.checkInTime) === 'warning' && (
                                                    <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full border border-yellow-200">Warn</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                className="bg-transparent text-gray-600 text-xs border-none focus:ring-0 cursor-pointer hover:text-ministry-orange"
                                                value={child.assignedTo || ''}
                                                onChange={(e) => handleAssignVolunteer(child, e.target.value)}
                                            >
                                                <option value="">Unassigned</option>
                                                {volunteers.map(v => (
                                                    <option key={v.id} value={v.name}>{v.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2 items-center">
                                                {selectedChildForReason === child.id ? (
                                                    <div className="flex animate-in slide-in-from-right fade-in duration-200">
                                                        <input
                                                            autoFocus
                                                            placeholder="Reason (e.g. Sick)"
                                                            className="text-xs border border-gray-300 rounded-l-lg p-1 w-24 focus:outline-none focus:border-ministry-orange"
                                                            value={absenceReason}
                                                            onChange={e => setAbsenceReason(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleUpdateStatus(child, 'Called', absenceReason);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateStatus(child, 'Called', absenceReason)}
                                                            className="bg-ministry-text text-white text-xs px-2 rounded-r-lg hover:bg-black"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setSelectedChildForReason(child.id)} className="text-xs text-gray-400 hover:text-gray-600 underline mr-2">
                                                        Add Reason
                                                    </button>
                                                )}

                                                <button onClick={() => handleUpdateStatus(child, 'Called')} title="Mark Called" className="p-2 hover:bg-blue-100 rounded-full text-blue-600"><Phone size={16} /></button>
                                                <button onClick={() => handleUpdateStatus(child, 'Message Sent')} title="Mark Message Sent" className="p-2 hover:bg-purple-100 rounded-full text-purple-600"><MessageSquare size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredAbsentees.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                            No absentees to display.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ACTION ITEMS VIEW */}
            {activeTab === 'action-items' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Auto-generated tasks based on data */}
                    {firstTimers.filter(c => !c.followUpStatus || c.followUpStatus === 'Pending').map(c => (
                        <div key={c.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-start mb-3">
                                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold uppercase px-2 py-1 rounded-full">First Visit Call</span>
                                <Calendar className="text-gray-400 w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-1">Call {c.parentName}</h3>
                            <p className="text-sm text-gray-500 mb-4">Regarding {c.name}'s first visit.</p>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleUpdateStatus(c, 'Called')}
                                    className="flex-1 bg-ministry-text text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    Mark Called
                                </button>
                                <a href={`tel:${c.parentContact}`} className="flex items-center justify-center w-10 h-9 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700" title="Call">
                                    <Phone className="w-4 h-4" />
                                </a>
                                <a
                                    href={`https://wa.me/${c.parentContact.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center w-10 h-9 bg-green-100 rounded-lg hover:bg-green-200 text-green-700"
                                    title="WhatsApp"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    ))}

                    {/* Auto-generated tasks for ABSENTEES (Severe only for priority) */}
                    {filteredAbsentees.filter(c => (!c.followUpStatus || c.followUpStatus === 'Pending') && getAbsenceSeverity(c.checkInTime) !== 'normal').map(c => (
                        <div key={`absent-${c.id}`} className={`bg-white p-5 rounded-xl shadow-sm border ${getAbsenceSeverity(c.checkInTime) === 'critical' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-yellow-500'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${getAbsenceSeverity(c.checkInTime) === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    Absentee Alert
                                </span>
                                <AlertTriangle className={`${getAbsenceSeverity(c.checkInTime) === 'critical' ? 'text-red-400' : 'text-yellow-400'} w-4 h-4`} />
                            </div>
                            <h3 className="font-bold text-gray-800 mb-1">Follow Up {c.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Absent for <span className="font-bold">{calculateMissedDuration(c.checkInTime)}</span>.
                            </p>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleUpdateStatus(c, 'Called')}
                                    className="flex-1 bg-ministry-text text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    Mark Called
                                </button>
                                <a href={`tel:${c.parentContact}`} className="flex items-center justify-center w-10 h-9 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700" title="Call">
                                    <Phone className="w-4 h-4" />
                                </a>
                                <a
                                    href={`https://wa.me/${c.parentContact.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center w-10 h-9 bg-green-100 rounded-lg hover:bg-green-200 text-green-700"
                                    title="WhatsApp"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    ))}

                    {firstTimers.filter(c => !c.followUpStatus || c.followUpStatus === 'Pending').length === 0 &&
                        filteredAbsentees.filter(c => (!c.followUpStatus || c.followUpStatus === 'Pending') && getAbsenceSeverity(c.checkInTime) !== 'normal').length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-400">
                                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>All clean! No pending action items.</p>
                            </div>
                        )}
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteSoul}
                title="Delete Soul"
                message="Are you sure you want to delete this soul? This action cannot be undone."
                type="danger"
                confirmText="Delete"
            />
        </div>
    );
};

export default NextGenFollowUp;
