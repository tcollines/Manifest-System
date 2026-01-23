import React, { useState, useEffect } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { User, MinistryEvent, SchoolOutreachReport, ModalType, Passenger } from '../types';
import { SchoolsStore } from '../database/schoolsStore';
import { EventStore } from '../database/eventStore';
import { supabase } from '../services/supabaseClient';
import * as XLSX from 'xlsx';
import {
    BookOpen,
    Calendar,
    Plus,
    FileText,
    Download,
    Users,
    Save,
    UserPlus
} from 'lucide-react';

interface SchoolsDashboardProps {
    currentUser: User | null;
    onOpenModal: (type: ModalType) => void;
}

const SchoolsDashboard: React.FC<SchoolsDashboardProps> = ({ currentUser, onOpenModal }) => {
    const { showToast } = useNotification();
    const [activeTab, setActiveTab] = useState<'reports' | 'events'>('reports');
    const [reports, setReports] = useState<SchoolOutreachReport[]>([]);
    const [events, setEvents] = useState<MinistryEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<MinistryEvent | null>(null);
    const [eventPassengers, setEventPassengers] = useState<Passenger[]>([]);

    // New Report State
    const [isAddingReport, setIsAddingReport] = useState(false);
    const [newReport, setNewReport] = useState<Partial<SchoolOutreachReport>>({
        date: new Date().toISOString().split('T')[0],
        labourers: [{ name: '', contact: '' }]
    });

    const refreshData = async () => {
        const [fetchedReports, fetchedEvents] = await Promise.all([
            SchoolsStore.getAllReports(),
            EventStore.getAll()
        ]);
        setReports(fetchedReports);
        setEvents(fetchedEvents);
    };

    useEffect(() => {
        refreshData();

        // Realtime subscription
        const channel = supabase.channel('schools_dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'school_outreach_reports' }, () => refreshData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // -- Report Handling --

    const handleAddLabourer = () => {
        setNewReport(prev => ({
            ...prev,
            labourers: [...(prev.labourers || []), { name: '', contact: '' }]
        }));
    };

    const handleLabourerChange = (index: number, field: 'name' | 'contact', value: string) => {
        const updatedLabourers = [...(newReport.labourers || [])];
        updatedLabourers[index] = { ...updatedLabourers[index], [field]: value };
        setNewReport(prev => ({ ...prev, labourers: updatedLabourers }));
    };

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            await SchoolsStore.addReport({
                ...newReport,
                submittedBy: currentUser.id
            } as any); // Type cast for simpler draft handling
            setIsAddingReport(false);
            setNewReport({
                date: new Date().toISOString().split('T')[0],
                labourers: [{ name: '', contact: '' }]
            });
            showToast('Report submitted successfully!', 'success');
        } catch (error) {
            showToast('Failed to submit report', 'error');
        }
    };

    // -- Event Handling --

    const handleViewEvent = async (event: MinistryEvent) => {
        setSelectedEvent(event);

        // Fetch passengers for this event that are students
        // NOTE: This assumes we have a way to query passengers by event. 
        // Since we don't have a direct store method for this in the context, 
        // we'll fetch from Supabase manually or assume a store update later.
        // For now, let's try to query public.passengers linked via vehicles to event stations?
        // Simplified: Query all passengers where vehicle->eventId matches.
        // Assuming 'passengers' table exists with 'category'='Student'.

        try {
            // 1. Get Stations for this Event
            const { data: stations, error: stationError } = await supabase
                .from('pickup_stations')
                .select('id')
                .eq('event_id', event.id);

            if (stationError) throw stationError;
            const stationIds = stations.map(s => s.id);

            if (stationIds.length === 0) {
                setEventPassengers([]);
                return;
            }

            // 2. Get Vehicles for these Stations
            const { data: vehicles, error: vehicleError } = await supabase
                .from('vehicles')
                .select('id, number_plate, driver_name, driver_contact')
                .in('station_id', stationIds);

            if (vehicleError) throw vehicleError;
            const vehicleIds = vehicles.map(v => v.id);
            const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

            if (vehicleIds.length === 0) {
                setEventPassengers([]);
                return;
            }

            // 3. Get Passengers for these Vehicles (Students only, or First Timers who are students)
            const { data: passengers, error: passengerError } = await supabase
                .from('passengers')
                .select('*')
                .in('vehicle_id', vehicleIds)
                .in('category', ['Student', 'First Timer']);

            if (passengerError) throw passengerError;

            // 4. Merge Data and Filter
            // We want to show all Students.
            // For "First Timers", we only show them if they seem to be students (have school/class info)
            // or if the user explicitly wants all First Timers here.
            // Given "first timers should also be students", we'll verify if they have student-like attributes 
            // OR if we should just trust the bus manifest content for this event. 
            // Use 'school' or 'student_class' presence as a heuristic for First Timers.
            const mappedPassengers = passengers
                .filter((p: any) => {
                    if (p.category === 'Student') return true;
                    if (p.category === 'First Timer') {
                        // Show if they have school info OR simply include them because they are on a school bus?
                        // Let's rely on school/class presence to distinguish from Adults
                        return p.school || p.student_class;
                    }
                    return false;
                })
                .map((p: any) => {
                    const vehicle = vehicleMap.get(p.vehicle_id);
                    return {
                        ...p,
                        vehicleNumberPlate: vehicle?.number_plate,
                        vehicleDriver: vehicle?.driver_name,
                        vehicleContact: vehicle?.driver_contact
                    };
                });

            setEventPassengers(mappedPassengers);

        } catch (error) {
            console.error("Error fetching event details:", error);
            showToast("Failed to load student list. Please try again.", 'error');
        }
    };

    const handleDownloadExcel = () => {
        if (!selectedEvent || eventPassengers.length === 0) return;

        const dataToExport = eventPassengers.map(p => ({
            Name: p.name,
            Contact: p.contact,
            School: p.school || 'N/A',
            Class: p.studentClass || 'N/A',
            Residence: p.residence,
            'First Timer': p.isFirstTime,
            'Soul Won': p.soulWon ? 'Yes' : 'No',
            'Vehicle Plate': (p as any).vehicleNumberPlate,
            'Driver Name': (p as any).vehicleDriver,
            'Driver Contact': (p as any).vehicleContact,
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        XLSX.writeFile(wb, `${selectedEvent.title}_Students.xlsx`);
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-ministry-text flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-ministry-orange" />
                        Schools Department
                    </h1>
                    <p className="text-gray-500">Manage outreach reports and student event attendance.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'reports' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    <span>Outreach Reports</span>
                </button>
                <button
                    onClick={() => setActiveTab('events')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'events' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <Calendar className="w-4 h-4" />
                    <span>Events & Students</span>
                </button>
            </div>

            {/* Content */}
            <div className="bg-ministry-card border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[500px]">

                {/* REPORTS TAB */}
                {activeTab === 'reports' && (
                    <div className="space-y-6">
                        {!isAddingReport ? (
                            <>
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-800">Recent Reports</h3>
                                    <button
                                        onClick={() => setIsAddingReport(true)}
                                        className="flex items-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-ministry-orange transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>New Report</span>
                                    </button>
                                </div>

                                <div className="grid gap-4">
                                    {reports.map(report => (
                                        <div key={report.id} className="bg-white border border-gray-100 p-4 rounded-xl hover:border-ministry-orange/30 transition-all shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-lg text-ministry-text">{report.centreName}</h4>
                                                    <p className="text-sm text-gray-500">{report.date} • {report.purpose}</p>
                                                </div>
                                                <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs">
                                                    {report.soulsWon} Souls Won
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t border-gray-50">
                                                <div>
                                                    <p className="text-gray-400 text-xs uppercase">Total Attendance</p>
                                                    <p className="font-bold">{report.totalAttendance}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-xs uppercase">Teachers</p>
                                                    <p className="font-bold">{report.teachersAttendance}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-xs uppercase">Students</p>
                                                    <p className="font-bold">{report.studentsAttendance}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-xs uppercase">Submitted By</p>
                                                    <p className="font-bold">Staff</p> {/* Ideally lookup user name */}
                                                </div>
                                            </div>
                                            {report.notes && (
                                                <div className="mt-3 bg-gray-50 p-2 rounded text-sm text-gray-600 italic">
                                                    "{report.notes}"
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {reports.length === 0 && (
                                        <p className="text-center text-gray-500 py-10">No reports submitted yet.</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleSubmitReport} className="max-w-3xl mx-auto space-y-6">
                                <div className="flex items-center justify-between border-b pb-4">
                                    <h3 className="text-xl font-bold">New Outreach Report</h3>
                                    <button type="button" onClick={() => setIsAddingReport(false)} className="text-gray-500 hover:text-black">Cancel</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Date</label>
                                        <input type="date" required value={newReport.date} onChange={e => setNewReport({ ...newReport, date: e.target.value })} className="w-full p-3 border rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Outreach Centre</label>
                                        <input required value={newReport.centreName || ''} onChange={e => setNewReport({ ...newReport, centreName: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="School Name" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Purpose</label>
                                    <input required value={newReport.purpose || ''} onChange={e => setNewReport({ ...newReport, purpose: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="e.g. Fellowship, Evangelism" />
                                </div>

                                {/* Stats */}
                                <div className="bg-gray-50 p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Total Attendance</label>
                                        <input type="number" required value={newReport.totalAttendance || ''} onChange={e => setNewReport({ ...newReport, totalAttendance: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Teachers</label>
                                        <input type="number" required value={newReport.teachersAttendance || ''} onChange={e => setNewReport({ ...newReport, teachersAttendance: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Students</label>
                                        <input type="number" required value={newReport.studentsAttendance || ''} onChange={e => setNewReport({ ...newReport, studentsAttendance: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Souls Won</label>
                                        <input type="number" required value={newReport.soulsWon || ''} onChange={e => setNewReport({ ...newReport, soulsWon: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg" />
                                    </div>
                                </div>

                                {/* Word */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Sermon Title</label>
                                        <input required value={newReport.sermonTitle || ''} onChange={e => setNewReport({ ...newReport, sermonTitle: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Title" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Scriptures</label>
                                        <input required value={newReport.scriptureReferences || ''} onChange={e => setNewReport({ ...newReport, scriptureReferences: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="John 3:16" />
                                    </div>
                                </div>

                                {/* Labourers */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-gray-700">Labourers</label>
                                        <button type="button" onClick={handleAddLabourer} className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">Add Person</button>
                                    </div>
                                    {newReport.labourers?.map((l, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input placeholder="Name" value={l.name} onChange={e => handleLabourerChange(idx, 'name', e.target.value)} className="flex-1 p-2 border rounded-lg" />
                                            <input placeholder="Contact" value={l.contact} onChange={e => handleLabourerChange(idx, 'contact', e.target.value)} className="flex-1 p-2 border rounded-lg" />
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Additional Notes</label>
                                    <textarea value={newReport.notes || ''} onChange={e => setNewReport({ ...newReport, notes: e.target.value })} className="w-full p-3 border rounded-xl h-24" placeholder="Any other observations..." />
                                </div>

                                <button type="submit" className="w-full bg-ministry-text text-white font-bold py-3 rounded-xl hover:bg-ministry-orange transition-colors flex justify-center items-center gap-2">
                                    <Save className="w-4 h-4" />
                                    <span>Submit Report</span>
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* EVENTS TAB */}
                {activeTab === 'events' && (
                    <div className="space-y-6">
                        {!selectedEvent ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {events.map(event => (
                                    <div key={event.id} onClick={() => handleViewEvent(event)} className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-md hover:border-ministry-orange cursor-pointer transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">{event.type}</span>
                                            <Calendar className="text-gray-400 w-5 h-5" />
                                        </div>
                                        <h3 className="text-xl font-bold text-ministry-text mb-1">{event.title}</h3>
                                        <p className="text-gray-500 text-sm mb-4">{event.date} • {event.time}</p>

                                        <div className="flex gap-4 text-sm font-medium">
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 text-xs">Total Students</span>
                                                <span className="text-lg font-bold">{event.stats?.students || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 text-xs">First Timers</span>
                                                <span className="text-lg font-bold text-ministry-orange">{event.stats?.firstTimers || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 text-xs">Souls</span>
                                                <span className="text-lg font-bold text-green-600">{event.stats?.soulsWon || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b pb-4">
                                    <div>
                                        <button onClick={() => setSelectedEvent(null)} className="text-gray-500 hover:text-black text-sm mb-1">← Back to Events</button>
                                        <h2 className="text-2xl font-bold text-ministry-text">{selectedEvent.title} <span className="text-gray-400 text-lg font-normal">Students List</span></h2>
                                    </div>
                                    <button onClick={handleDownloadExcel} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                                        <Download className="w-4 h-4" />
                                        <span>Download Excel</span>
                                    </button>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                                        <p className="text-gray-500 text-xs uppercase font-bold">Total Students</p>
                                        <p className="text-2xl font-black">{eventPassengers.length}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                                        <p className="text-gray-500 text-xs uppercase font-bold">First Timers</p>
                                        <p className="text-2xl font-black text-ministry-orange">{eventPassengers.filter(p => p.isFirstTime === 'Yes').length}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                                        <p className="text-gray-500 text-xs uppercase font-bold">Souls Won</p>
                                        <p className="text-2xl font-black text-green-600">{eventPassengers.filter(p => p.soulWon).length}</p>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="bg-white border md:rounded-xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
                                            <tr>
                                                <th className="p-4">Name</th>
                                                <th className="p-4">School / Class</th>
                                                <th className="p-4">Contact</th>
                                                <th className="p-4">Vehicle</th>
                                                <th className="p-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {eventPassengers.map(p => (
                                                <tr key={p.id} className="hover:bg-gray-50">
                                                    <td className="p-4 font-bold text-gray-900">{p.name}</td>
                                                    <td className="p-4 text-sm text-gray-600">{p.school} • {p.studentClass}</td>
                                                    <td className="p-4 text-sm font-mono text-gray-500">{p.contact}</td>
                                                    <td className="p-4 text-sm">
                                                        <div className="text-gray-800 font-bold">{(p as any).vehicleNumberPlate}</div>
                                                        <div className="text-xs text-gray-500">{(p as any).vehicleDriver}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        {p.soulWon && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold mr-2">Soul Won</span>}
                                                        {p.isFirstTime === 'Yes' && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">First Timer</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                            {eventPassengers.length === 0 && (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No students found for this event.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default SchoolsDashboard;
