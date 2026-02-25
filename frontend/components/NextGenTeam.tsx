import React, { useState, useEffect } from 'react';
import { User, MinistryEvent, VolunteerAttendance } from '../types';
import { UserStore } from '../database/userStore';
import { EventStore } from '../database/eventStore';
import { VolunteerAttendanceStore } from '../database/volunteerAttendanceStore';
import { IncidentStore } from '../database/incidentStore';
import { TrainingStore } from '../database/trainingStore';
import { ChildStore } from '../database/childStore';
import { DEPARTMENTS } from '../constants';
import { Search, UserCheck, Shield, BookOpen, AlertCircle, CheckCircle, Clock, Calendar, ChevronDown, CheckSquare, XSquare, Edit2, Trash2 } from 'lucide-react';
import { useNotification } from './ui/NotificationSystem';

interface NextGenTeamProps {
    currentUser?: User | null;
}

const NextGenTeam: React.FC<NextGenTeamProps> = ({ currentUser }) => {
    const { showToast } = useNotification();
    const [volunteers, setVolunteers] = useState<User[]>([]);
    const [events, setEvents] = useState<MinistryEvent[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Attendance State
    const [searchQuery, setSearchQuery] = useState('');
    const [attendance, setAttendance] = useState<Record<string, 'Present' | 'Late' | 'Absent'>>({});
    const [activeTab, setActiveTab] = useState<'attendance' | 'incidents' | 'training'>('attendance');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Late' | 'Absent' | 'Unmarked'>('All');

    // Incident State
    const [incidents, setIncidents] = useState<any[]>([]);
    const [incidentForm, setIncidentForm] = useState({
        childId: '',
        type: 'Behavioral' as 'Behavioral' | 'Medical' | 'Safety' | 'Other',
        description: '',
        severity: 'Low' as 'Low' | 'Medium' | 'High'
    });
    const [childSearchQuery, setChildSearchQuery] = useState('');
    const [foundChildren, setFoundChildren] = useState<any[]>([]);

    // Training State
    const [trainingRequests, setTrainingRequests] = useState<any[]>([]);
    const [trainingForm, setTrainingForm] = useState({ topic: '', comments: '' });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedServiceId) {
            loadAttendance(selectedServiceId);
        }
    }, [selectedServiceId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [allUsersResponse, allEvents, allIncidents, allTraining] = await Promise.all([
                UserStore.getAll(),
                EventStore.getAll().then(res => res.data),
                IncidentStore.getAll(),
                TrainingStore.getAll()
            ]);

            const allUsers = allUsersResponse.status === 'success' && allUsersResponse.data ? allUsersResponse.data : [];

            // Filter Volunteers
            const nextGenDeptId = DEPARTMENTS.find(d => d.name === 'Next Gen')?.id;
            const team = allUsers.filter(u =>
                (nextGenDeptId && u.departmentId === nextGenDeptId) ||
                (u.role && u.role.toLowerCase().includes('next gen'))
            );
            setVolunteers(team);

            // Filter Services (sorted by date desc)
            const services = allEvents
                .filter(e => e.type === 'Service')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setEvents(services);
            setIncidents(allIncidents);
            setTrainingRequests(allTraining);

            if (services.length > 0) {
                // If not already set (e.g. by prop or whatever), defaults to latest
                if (!selectedServiceId) setSelectedServiceId(services[0].id);
            }
        } catch (error) {
            console.error("Failed to load data", error);
            showToast("Failed to load team data", 'error');
        } finally {
            setLoading(false);
        }
    };

    const [showChildDropdown, setShowChildDropdown] = useState(false);

    // Child Search for Incidents
    useEffect(() => {
        if (childSearchQuery.length > 2) {
            const search = async () => {
                const results = await ChildStore.getAll(); // Ideally use a search endpoint if available
                const filtered = results.filter(c => c.name.toLowerCase().includes(childSearchQuery.toLowerCase()));
                setFoundChildren(filtered.slice(0, 5));
                setShowChildDropdown(true);
            };
            search();
        } else {
            setFoundChildren([]);
            setShowChildDropdown(false);
        }
    }, [childSearchQuery]);

    const loadAttendance = async (serviceId: string) => {
        try {
            const records = await VolunteerAttendanceStore.getByService(serviceId);
            const attendanceMap: Record<string, 'Present' | 'Late' | 'Absent'> = {};
            records.forEach(r => {
                attendanceMap[r.volunteerId] = r.status;
            });
            setAttendance(attendanceMap);
        } catch (error) {
            console.error("Failed to load attendance", error);
        }
    };

    const handleSubmitIncident = async () => {
        if (!selectedServiceId || !currentUser) {
            showToast("Please select a service context first.", 'error');
            return;
        }
        if (!incidentForm.description) {
            showToast("Please provide a description.", 'error');
            return;
        }

        if (!incidentForm.type) {
            showToast("Please select an incident type.", 'error');
            return;
        }

        try {
            const selectedEvent = events.find(e => e.id === selectedServiceId);
            const dateStr = selectedEvent?.date || new Date().toISOString().split('T')[0];

            const newIncident = {
                childId: incidentForm.childId, // Can be empty if general
                serviceId: selectedServiceId,
                date: dateStr,
                reportedBy: currentUser.name,
                type: incidentForm.type,
                description: incidentForm.description,
                severity: incidentForm.severity,
                status: 'Open' as const
            };

            const saved = await IncidentStore.add(newIncident);
            setIncidents([saved, ...incidents]);
            setIncidentForm({ ...incidentForm, description: '', childId: '' });
            setChildSearchQuery('');
            showToast("Incident reported successfully.", 'success');
        } catch (error: any) {
            console.error(error);
            showToast(`Failed to report incident: ${error.message || 'Unknown error'}`, 'error');
        }
    };

    const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

    const handleSubmitTraining = async () => {
        if (!trainingForm.topic || !currentUser) return;

        try {
            if (editingRequestId) {
                // Update existing
                const request = trainingRequests.find(r => r.id === editingRequestId);
                if (!request) return;

                const updated = { ...request, topic: trainingForm.topic, comments: trainingForm.comments }; // Keep existing status/date
                await TrainingStore.update(updated);

                setTrainingRequests(prev => prev.map(r => r.id === editingRequestId ? updated : r));
                showToast("Training request updated.", 'success');
                setEditingRequestId(null);
            } else {
                // Create new
                const request = {
                    requesterId: currentUser.id,
                    topic: trainingForm.topic,
                    date: new Date().toISOString(), // Request Date
                    comments: trainingForm.comments
                };
                const saved = await TrainingStore.add(request);
                setTrainingRequests([saved, ...trainingRequests]);
                showToast("Training request submitted.", 'success');
            }
            setTrainingForm({ topic: '', comments: '' });
        } catch (error) {
            console.error(error);
            showToast("Failed to submit request.", 'error');
        }
    };

    const handleDeleteTraining = async (id: string) => {
        if (!confirm("Delete this training request?")) return;
        try {
            await TrainingStore.delete(id);
            setTrainingRequests(prev => prev.filter(r => r.id !== id));
            showToast("Request deleted.", 'success');
        } catch (e) {
            console.error(e);
            showToast("Failed to delete.", 'error');
        }
    };

    const handleTrainingStatusChange = async (id: string, newStatus: 'Pending' | 'Approved' | 'Completed') => {
        try {
            const req = trainingRequests.find(r => r.id === id);
            if (!req) return;

            const updated = { ...req, status: newStatus };
            await TrainingStore.update(updated);
            setTrainingRequests(prev => prev.map(r => r.id === id ? updated : r));
            showToast(`Status updated to ${newStatus}`, 'success');
        } catch (e) {
            console.error(e);
            showToast("Failed update status.", 'error');
        }
    };

    const handleEditTraining = (req: any) => {
        setTrainingForm({ topic: req.topic, comments: req.comments || '' });
        setEditingRequestId(req.id);
        // Scroll to top or form?
    };

    const [trainingSort, setTrainingSort] = useState<'DateDesc' | 'DateAsc' | 'Status'>('DateDesc');
    const sortedTrainingRequests = [...trainingRequests].sort((a, b) => {
        if (trainingSort === 'DateDesc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (trainingSort === 'DateAsc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (trainingSort === 'Status') return a.status.localeCompare(b.status);
        return 0;
    });

    const handleStatusUpdate = async (incidentId: string, newStatus: 'Open' | 'Resolved') => {
        try {
            const incident = incidents.find(i => i.id === incidentId);
            if (!incident) return;

            const updated = { ...incident, status: newStatus };
            await IncidentStore.update(updated); // Ensure IncidentStore.update exists and works

            setIncidents(prev => prev.map(i => i.id === incidentId ? updated : i));
            if (selectedIncident?.id === incidentId) {
                // Eager loaded name should persist from the incident object
                setSelectedIncident(updated);
            }
            showToast(`Incident marked as ${newStatus}`, 'success');
        } catch (error) {
            console.error("Failed to update status", error);
            showToast("Failed to update incident status", 'error');
        }
    };

    const handleDeleteIncident = async (incidentId: string) => {
        if (!confirm("Are you sure you want to delete this incident record?")) return;
        try {
            await IncidentStore.delete(incidentId);
            setIncidents(prev => prev.filter(i => i.id !== incidentId));
            setSelectedIncident(null);
            showToast("Incident report deleted.", 'success');
        } catch (error: any) {
            console.error("Failed to delete incident", error);
            showToast("Failed to delete incident.", 'error');
        }
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editFormState, setEditFormState] = useState<any>({});

    const startEditing = () => {
        setEditFormState({
            description: selectedIncident.description,
            type: selectedIncident.type,
            severity: selectedIncident.severity
        });
        setIsEditing(true);
    };

    const handleUpdateIncident = async () => {
        try {
            const updated = { ...selectedIncident, ...editFormState };
            await IncidentStore.update(updated);

            setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
            setSelectedIncident(updated);
            setIsEditing(false);
            showToast("Incident updated successfully.", 'success');
        } catch (error) {
            console.error("Failed to update incident", error);
            showToast("Failed to update incident.", 'error');
        }
    };

    const handleAttendanceChange = async (userId: string, newStatus: 'Present' | 'Late' | 'Absent') => {
        const currentStatus = attendance[userId];
        const isDeselecting = currentStatus === newStatus;

        // Optimistic Update
        setAttendance(prev => {
            const next = { ...prev };
            if (isDeselecting) {
                delete next[userId];
            } else {
                next[userId] = newStatus;
            }
            return next;
        });

        if (!selectedServiceId) return;

        try {
            const selectedEvent = events.find(e => e.id === selectedServiceId);
            if (!selectedEvent) return;

            if (isDeselecting) {
                await VolunteerAttendanceStore.delete(userId, selectedServiceId);
            } else {
                const record: VolunteerAttendance = {
                    id: crypto.randomUUID(),
                    volunteerId: userId,
                    serviceId: selectedServiceId,
                    date: selectedEvent.date,
                    role: volunteers.find(v => v.id === userId)?.role || 'Volunteer',
                    status: newStatus,
                    timestamp: new Date().toISOString(),
                    manifestId: currentUser?.manifestId || '' // Failsafe, though required in DB
                };
                await VolunteerAttendanceStore.save(record);
            }
        } catch (error: any) {
            console.error("Failed to auto-save attendance", error);
            showToast(`Failed to save: ${error.message || 'Unknown error'}`, 'error');
            // Revert on error
            setAttendance(prev => ({
                ...prev,
                [userId]: currentStatus // Restore old status
            }));
        }
    };

    // Sorting & Filtering Logic for Incidents
    const [sortOption, setSortOption] = useState<'DateDesc' | 'DateAsc' | 'SeverityHigh' | 'StatusOpen' | 'Type' | 'Service'>('DateDesc');
    const [reportSearchQuery, setReportSearchQuery] = useState('');

    const filteredAndSortedIncidents = incidents
        .filter(inc => {
            if (!reportSearchQuery) return true;
            const query = reportSearchQuery.toLowerCase();
            const childName = inc.childName?.toLowerCase() || '';
            const serviceTitle = events.find(e => e.id === inc.serviceId)?.title.toLowerCase() || '';

            return (
                inc.type.toLowerCase().includes(query) ||
                inc.description.toLowerCase().includes(query) ||
                childName.includes(query) ||
                serviceTitle.includes(query)
            );
        })
        .sort((a, b) => {
            if (sortOption === 'DateDesc') return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortOption === 'DateAsc') return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (sortOption === 'SeverityHigh') {
                const severityMap: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
                return (severityMap[b.severity] || 0) - (severityMap[a.severity] || 0);
            }
            if (sortOption === 'StatusOpen') {
                if (a.status === b.status) return new Date(b.date).getTime() - new Date(a.date).getTime();
                return (a.status === 'Open' ? -1 : 1);
            }
            if (sortOption === 'Type') return a.type.localeCompare(b.type);
            if (sortOption === 'Service') {
                const tA = events.find(e => e.id === a.serviceId)?.title || '';
                const tB = events.find(e => e.id === b.serviceId)?.title || '';
                return tA.localeCompare(tB);
            }
            return 0;
        });



    const filteredVolunteers = volunteers.filter(v => {
        const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

        let matchesSearch = true;
        if (tokens.length > 0) {
            const name = v.name.toLowerCase();
            const role = v.role.toLowerCase();
            const contactRaw = v.contact || '';
            const contactClean = contactRaw.replace(/\D/g, '');

            matchesSearch = tokens.every(token => {
                if (name.includes(token) || role.includes(token)) return true;

                const tokenClean = token.replace(/\D/g, '');
                if (tokenClean.length > 0 && contactClean.includes(tokenClean)) return true;

                return false;
            });
        }

        if (!matchesSearch) return false;

        const status = attendance[v.id]; // Present, Late, Absent, or undefined

        if (statusFilter === 'All') return true;
        if (statusFilter === 'Unmarked') return !status;
        return status === statusFilter;
    });

    const getInitials = (name: string) => {
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const selectedService = events.find(e => e.id === selectedServiceId);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-ministry-text">Next Gen Team</h1>
                    <p className="text-gray-500 mt-1">Manage volunteers, track attendance, and report incidents.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'attendance' ? 'bg-white shadow text-ministry-text' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <UserCheck size={16} />
                        <span>Attendance</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('incidents')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'incidents' ? 'bg-white shadow text-ministry-text' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Shield size={16} />
                        <span>Incidents</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('training')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'training' ? 'bg-white shadow text-ministry-text' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <BookOpen size={16} />
                        <span>Training</span>
                    </button>
                </div>
            </header>

            {activeTab === 'attendance' && (
                <div className="space-y-6">
                    {/* Service Selector & Toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Calendar className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    value={selectedServiceId}
                                    onChange={(e) => setSelectedServiceId(e.target.value)}
                                    className="block w-full md:w-64 pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-ministry-orange/20 focus:border-ministry-orange font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    {events.map(event => (
                                        <option key={event.id} value={event.id}>
                                            {event.date} - {event.title}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                </div>
                            </div>

                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                            {/* Status Filter Dropdown */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Clock className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="block w-40 pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-ministry-orange/20 focus:border-ministry-orange font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Present">Present</option>
                                    <option value="Late">Late</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Unmarked">Unmarked</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                </div>
                            </div>

                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search volunteers..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                            <div className="text-sm font-bold text-gray-500 hidden sm:block">
                                Total: {filteredVolunteers.length}
                            </div>
                        </div>
                    </div>

                    {/* Mobile View (Cards) */}
                    <div className="md:hidden space-y-4">
                        {filteredVolunteers.map(volunteer => (
                            <div key={volunteer.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ministry-orange/10 to-ministry-neon/10 text-ministry-orange flex items-center justify-center text-xs font-bold border border-white shadow-sm">
                                            {getInitials(volunteer.name)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{volunteer.name}</div>
                                            <div className="text-xs text-gray-500 font-medium">{volunteer.role}</div>
                                        </div>
                                    </div>
                                    {attendance[volunteer.id] && (
                                        <div className="flex items-center">
                                            {attendance[volunteer.id] === 'Present' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                            {attendance[volunteer.id] === 'Late' && <Clock className="w-5 h-5 text-yellow-500" />}
                                            {attendance[volunteer.id] === 'Absent' && <AlertCircle className="w-5 h-5 text-red-500" />}
                                        </div>
                                    )}
                                </div>

                                <div className="flex bg-gray-50 p-1 rounded-lg">
                                    <button
                                        onClick={() => handleAttendanceChange(volunteer.id, 'Present')}
                                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${attendance[volunteer.id] === 'Present' ? 'bg-white text-green-600 shadow-sm ring-1 ring-green-100' : 'text-gray-500'}`}
                                    >
                                        Present
                                    </button>
                                    <button
                                        onClick={() => handleAttendanceChange(volunteer.id, 'Late')}
                                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${attendance[volunteer.id] === 'Late' ? 'bg-white text-yellow-600 shadow-sm ring-1 ring-yellow-100' : 'text-gray-500'}`}
                                    >
                                        Late
                                    </button>
                                    <button
                                        onClick={() => handleAttendanceChange(volunteer.id, 'Absent')}
                                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${attendance[volunteer.id] === 'Absent' ? 'bg-white text-red-600 shadow-sm ring-1 ring-red-100' : 'text-gray-500'}`}
                                    >
                                        Absent
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Volunteer</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {filteredVolunteers.map(volunteer => (
                                    <tr key={volunteer.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ministry-orange/10 to-ministry-neon/10 text-ministry-orange flex items-center justify-center text-xs font-bold border border-white shadow-sm">
                                                    {getInitials(volunteer.name)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{volunteer.name}</div>
                                                    <div className="text-xs text-gray-500 font-medium">{volunteer.contact || 'No contact'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-semibold border border-gray-200">
                                                {volunteer.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center bg-gray-100 p-1 rounded-lg w-fit mx-auto">
                                                <button
                                                    onClick={() => handleAttendanceChange(volunteer.id, 'Present')}
                                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${attendance[volunteer.id] === 'Present' ? 'bg-white text-green-600 shadow-sm ring-1 ring-green-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                                                >
                                                    Present
                                                </button>
                                                <button
                                                    onClick={() => handleAttendanceChange(volunteer.id, 'Late')}
                                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${attendance[volunteer.id] === 'Late' ? 'bg-white text-yellow-600 shadow-sm ring-1 ring-yellow-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                                                >
                                                    Late
                                                </button>
                                                <button
                                                    onClick={() => handleAttendanceChange(volunteer.id, 'Absent')}
                                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${attendance[volunteer.id] === 'Absent' ? 'bg-white text-red-600 shadow-sm ring-1 ring-red-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                                                >
                                                    Absent
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {attendance[volunteer.id] === 'Present' && <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />}
                                            {attendance[volunteer.id] === 'Late' && <Clock className="w-5 h-5 text-yellow-500 ml-auto" />}
                                            {attendance[volunteer.id] === 'Absent' && <AlertCircle className="w-5 h-5 text-red-500 ml-auto" />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'incidents' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-ministry-orange" />
                            Report an Incident
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Context</label>
                                    <select
                                        value={incidentForm.serviceId}
                                        onChange={(e) => setIncidentForm(prev => ({ ...prev, serviceId: e.target.value }))}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                    >
                                        <option value="">-- Select Service --</option>
                                        {events.filter(e => e.type === 'Service').map(e => (
                                            <option key={e.id} value={e.id}>{e.date} - {e.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Child Involved (Optional)</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search child..."
                                            value={childSearchQuery}
                                            onChange={e => {
                                                setChildSearchQuery(e.target.value);
                                                setShowChildDropdown(true);
                                            }}
                                            onFocus={() => {
                                                if (childSearchQuery.length > 2) setShowChildDropdown(true);
                                            }}
                                            className="w-full pl-9 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-ministry-orange/20 focus:border-ministry-orange"
                                        />
                                        {/* Dropdown Results */}
                                        {showChildDropdown && childSearchQuery.length > 2 && (
                                            <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {foundChildren.length > 0 ? (
                                                    foundChildren.map(child => (
                                                        <div
                                                            key={child.id}
                                                            onClick={() => {
                                                                setIncidentForm(prev => ({ ...prev, childId: child.id }));
                                                                setChildSearchQuery(child.name);
                                                                setFoundChildren([]);
                                                                setShowChildDropdown(false);
                                                            }}
                                                            className="p-2.5 hover:bg-gray-50 cursor-pointer flex justify-between items-center text-sm"
                                                        >
                                                            <span>{child.name}</span>
                                                            <span className="text-gray-400 text-xs">{child.parentName}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-2.5 text-gray-500 text-xs text-center">No children found in Next Gen DB</div>
                                                )}
                                            </div>
                                        )}
                                        {incidentForm.childId && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600">
                                                <CheckCircle size={16} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Leave blank for general safety issues.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Behavioral', 'Medical', 'Safety', 'Other'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setIncidentForm(prev => ({
                                                    ...prev,
                                                    type: prev.type === type ? '' as any : type as any
                                                }))}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${incidentForm.type === type ? 'bg-ministry-orange text-white border-ministry-orange' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Low', 'Medium', 'High'].map(lev => (
                                            <button
                                                key={lev}
                                                onClick={() => setIncidentForm(prev => ({ ...prev, severity: lev as any }))}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${incidentForm.severity === lev
                                                    ? (lev === 'High' ? 'bg-red-500 text-white border-red-500' : (lev === 'Medium' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-green-500 text-white border-green-500'))
                                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                                            >
                                                {lev}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        rows={4}
                                        value={incidentForm.description}
                                        onChange={e => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-ministry-orange/20 focus:border-ministry-orange"
                                        placeholder="Describe what happened..."
                                    ></textarea>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSubmitIncident}
                                        className="bg-ministry-text text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
                                    >
                                        Submit Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Incident History List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h3 className="font-bold text-gray-700 text-sm uppercase whitespace-nowrap">Recent Reports</h3>

                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-48">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                                    <input
                                        type="text"
                                        placeholder="Search by child, type..."
                                        value={reportSearchQuery}
                                        onChange={(e) => setReportSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-ministry-orange"
                                    />
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Sort:</span>
                                    <select
                                        value={sortOption}
                                        onChange={(e) => setSortOption(e.target.value as any)}
                                        className="w-full sm:w-auto text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg py-1.5 pl-2 pr-6 focus:outline-none focus:ring-1 focus:ring-ministry-orange cursor-pointer"
                                    >
                                        <option value="DateDesc">Newest</option>
                                        <option value="DateAsc">Oldest</option>
                                        <option value="SeverityHigh">Severity</option>
                                        <option value="StatusOpen">Status</option>
                                        <option value="Type">Type</option>
                                        <option value="Service">Service</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        {filteredAndSortedIncidents.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                {reportSearchQuery ? 'No matching reports found.' : 'No recent incidents recorded.'}
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {filteredAndSortedIncidents.map(inc => (
                                    <div
                                        key={inc.id}
                                        onClick={() => setSelectedIncident(inc)}
                                        className="p-4 flex flex-col md:flex-row gap-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                                    >
                                        <div className="flex-shrink-0">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${inc.severity === 'High' ? 'bg-red-100 text-red-600' : (inc.severity === 'Medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600')}`}>
                                                <AlertCircle size={20} />
                                            </div>
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-800 group-hover:text-ministry-orange transition-colors">{inc.type} Incident</h4>
                                                <span className="text-xs text-gray-500">{new Date(inc.date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{inc.description}</p>
                                            <div className="flex gap-2 mt-2 text-xs">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-500">Rep: {inc.reportedBy}</span>
                                                {inc.status === 'Open' ? (
                                                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">Open</span>
                                                ) : (
                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">Resolved</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'training' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-ministry-purple/5 border border-ministry-purple/10 p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-ministry-purple mb-1">Training Resources</h3>
                            <p className="text-sm text-gray-600">Access guides on child safety, teaching curriculum, and emergency protocols.</p>
                        </div>
                        <button className="bg-white text-ministry-purple border border-ministry-purple/20 px-4 py-2 rounded-lg font-bold text-sm hover:bg-ministry-purple/10 transition-colors">
                            View Resources Library
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-ministry-orange" />
                            {editingRequestId ? 'Edit Training Request' : 'Request Training'}
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Topic or Area of Need</label>
                                <input
                                    type="text"
                                    value={trainingForm.topic}
                                    onChange={e => setTrainingForm(prev => ({ ...prev, topic: e.target.value }))}
                                    placeholder="e.g. Dealing with difficult behavior, First Aid..."
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comments (Optional)</label>
                                <input
                                    type="text"
                                    value={trainingForm.comments}
                                    onChange={e => setTrainingForm(prev => ({ ...prev, comments: e.target.value }))}
                                    placeholder="Any specific context?"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                {editingRequestId && (
                                    <button
                                        onClick={() => { setEditingRequestId(null); setTrainingForm({ topic: '', comments: '' }); }}
                                        className="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    onClick={handleSubmitTraining}
                                    className="bg-ministry-text text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
                                >
                                    {editingRequestId ? 'Update Request' : 'Submit Request'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 text-sm uppercase">All Requests</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Sort by:</span>
                                <select
                                    value={trainingSort}
                                    onChange={(e) => setTrainingSort(e.target.value as any)}
                                    className="text-xs border border-gray-200 rounded p-1"
                                >
                                    <option value="DateDesc">Newest</option>
                                    <option value="DateAsc">Oldest</option>
                                    <option value="Status">Status</option>
                                </select>
                            </div>
                        </div>
                        {/* Mobile View */}
                        <div className="md:hidden space-y-4 p-4">
                            {sortedTrainingRequests.map(req => (
                                <div key={req.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-900">{req.topic}</h4>
                                        <select
                                            value={req.status}
                                            onChange={(e) => handleTrainingStatusChange(req.id, e.target.value as any)}
                                            className={`px-2 py-1 rounded text-xs font-bold border-none focus:ring-1 focus:ring-ministry-orange ${req.status === 'Completed' ? 'bg-green-100 text-green-700' : (req.status === 'Approved' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600')}`}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">{req.comments || 'No comments'}</p>
                                    <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-200 pt-2 mt-2">
                                        <span>{new Date(req.date).toLocaleDateString()}</span>
                                        <div className="flex gap-3">
                                            <button onClick={() => handleEditTraining(req)} className="text-blue-600 font-bold">Edit</button>
                                            <button onClick={() => handleDeleteTraining(req.id)} className="text-red-600 font-bold">Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-bold">
                                    <tr>
                                        <th className="p-4">Topic</th>
                                        <th className="p-4">Requester</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedTrainingRequests.map(req => (
                                        <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50/50 group">
                                            <td className="p-4 font-medium text-gray-800">
                                                {req.topic}
                                                {req.comments && <p className="text-xs text-gray-500 mt-1 font-normal">{req.comments}</p>}
                                            </td>
                                            <td className="p-4 text-gray-600">{req.requesterName || 'Unknown'}</td>
                                            <td className="p-4 text-gray-500">{new Date(req.date).toLocaleDateString()}</td>
                                            <td className="p-4">
                                                <select
                                                    value={req.status}
                                                    onChange={(e) => handleTrainingStatusChange(req.id, e.target.value as any)}
                                                    className={`px-2 py-1 rounded text-xs font-bold border-none focus:ring-1 focus:ring-ministry-orange cursor-pointer ${req.status === 'Completed' ? 'bg-green-100 text-green-700' : (req.status === 'Approved' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}`}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Approved">Approved</option>
                                                    <option value="Completed">Completed</option>
                                                </select>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEditTraining(req)}
                                                        className="p-1 hover:bg-gray-100 rounded text-blue-600" title="Edit">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTraining(req.id)}
                                                        className="p-1 hover:bg-red-50 rounded text-red-600" title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {/* Incident Details Modal */}
            {selectedIncident && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className={`p-6 border-b border-gray-100 flex justify-between items-start ${selectedIncident.severity === 'High' ? 'bg-red-50' : (selectedIncident.severity === 'Medium' ? 'bg-yellow-50' : 'bg-green-50')}`}>
                            <div>
                                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                    {isEditing ? 'Make Changes' : `${selectedIncident.type} Incident`}
                                    {!isEditing && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${selectedIncident.severity === 'High' ? 'bg-red-100 text-red-700 border-red-200' : (selectedIncident.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-100 text-green-700 border-green-200')}`}>
                                            {selectedIncident.severity} Severity
                                        </span>
                                    )}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">{new Date(selectedIncident.date).toLocaleDateString()}</p>
                            </div>
                            <button
                                onClick={() => { setSelectedIncident(null); setIsEditing(false); }}
                                className="p-1 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <XSquare className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                                {isEditing ? (
                                    <textarea
                                        value={editFormState.description}
                                        onChange={e => setEditFormState(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-ministry-orange/20"
                                        rows={4}
                                    />
                                ) : (
                                    <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-sm leading-relaxed border border-gray-100">
                                        {selectedIncident.description}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {isEditing ? (
                                    <>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Type</h4>
                                            <select
                                                value={editFormState.type}
                                                onChange={e => setEditFormState(prev => ({ ...prev, type: e.target.value }))}
                                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                            >
                                                {['Behavioral', 'Medical', 'Safety', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Severity</h4>
                                            <select
                                                value={editFormState.severity}
                                                onChange={e => setEditFormState(prev => ({ ...prev, severity: e.target.value }))}
                                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                            >
                                                {['Low', 'Medium', 'High'].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reported By</h4>
                                            <p className="font-medium text-gray-800">{selectedIncident.reportedBy}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Status</h4>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${selectedIncident.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {selectedIncident.status === 'Resolved' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                                {selectedIncident.status}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {selectedIncident.childId && (
                                <div>
                                    {/* We would typically look up the child name here if we had the full list or passed it in, 
                                        but for now we might just have the ID or need to find it in "foundChildren" if cached, 
                                        or ideally "incidents" should join/fetch child data. 
                                        For MVP, we show "Child Involved" basic info or just ID if name missing. 
                                        Assuming the store/backend might fetch name later. */}
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Child Involved</h4>
                                    <p className="font-medium text-gray-800">
                                        {selectedIncident.childName || `ID: ${selectedIncident.childId}`}
                                    </p>
                                </div>
                            )}

                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between gap-3">
                            {isEditing ? (
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="text-gray-500 hover:text-gray-700 font-bold text-xs px-2"
                                >
                                    Cancel
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleDeleteIncident(selectedIncident.id)}
                                    className="text-red-500 hover:text-red-700 font-bold text-xs flex items-center gap-1 px-2"
                                >
                                    Delete Report
                                </button>
                            )}
                            {isEditing ? (
                                <button
                                    onClick={handleUpdateIncident}
                                    className="flex items-center gap-2 bg-ministry-orange text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition-colors shadow-sm"
                                >
                                    <CheckSquare size={16} />
                                    Save Changes
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={startEditing}
                                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    {selectedIncident.status === 'Open' ? (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedIncident.id, 'Resolved')}
                                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition-colors shadow-sm"
                                        >
                                            <CheckCircle size={16} />
                                            Mark as Resolved
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedIncident.id, 'Open')}
                                            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors"
                                        >
                                            <Clock size={16} />
                                            Re-open Incident
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NextGenTeam;
