
import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { User, MinistryEvent, SchoolOutreachReport, ModalType, Passenger } from '../types';
import { SchoolsStore, mapSchoolReportFromDB } from '../database/schoolsStore';
import { EventStore } from '../database/eventStore';
import { ManifestStore } from '../database/manifestStore'; // Added ManifestStore
import { supabase } from '../services/supabaseClient';
import { apiFetch } from '../services/api';

import * as XLSX from 'xlsx';
import {
    ClipboardCheck,
    Search,
    Plus,
    CheckCircle,
    Calendar,
    Users,
    FileText,
    BookOpen,
    Trash2,
    Save,
    X,
    Filter,
    Download
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface SchoolsDashboardProps {
    currentUser: User;
    events: MinistryEvent[];
    onOpenModal: (type: ModalType) => void;
}

export const SchoolsDashboard: React.FC<SchoolsDashboardProps> = ({
    currentUser,
    events,
    onOpenModal
}) => {
    const { showToast } = useNotification();
    const [activeTab, setActiveTab] = useState<'reports' | 'events'>('reports');
    const [reports, setReports] = useState<SchoolOutreachReport[]>([]);
    const [isAddingReport, setIsAddingReport] = useState(false);
    const [newReport, setNewReport] = useState<Partial<SchoolOutreachReport>>({
        date: new Date().toISOString().split('T')[0],
        labourers: []
    });

    const [selectedEvent, setSelectedEvent] = useState<MinistryEvent | null>(null);
    const [reportEventId, setReportEventId] = useState<string>(''); // For filtering reports
    const [eventPassengers, setEventPassengers] = useState<Passenger[]>([]);
    const [eventFilter, setEventFilter] = useState<'all' | 'first-timers' | 'souls-won'>('all');

    useEffect(() => {
        loadReports(reportEventId);

        const channel = supabase.channel('schools-reports-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'school_outreach_reports' }, (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;
                if (eventType === 'INSERT') {
                    const mapped = mapSchoolReportFromDB(newRecord);
                    if (!reportEventId || mapped.eventId === reportEventId) {
                        setReports(prev => [mapped, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    }
                } else if (eventType === 'UPDATE') {
                    const mapped = mapSchoolReportFromDB(newRecord);
                    if (!reportEventId || mapped.eventId === reportEventId) {
                        setReports(prev => prev.map(r => r.id === mapped.id ? mapped : r).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    } else {
                        setReports(prev => prev.filter(r => r.id !== mapped.id));
                    }
                } else if (eventType === 'DELETE') {
                    setReports(prev => prev.filter(r => r.id !== oldRecord.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [reportEventId]);

    const loadReports = async (eventId?: string) => {
        const data = await SchoolsStore.getAllReports(eventId);
        setReports(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const handleAddLabourer = () => {
        const current = newReport.labourers || [];
        setNewReport({ ...newReport, labourers: [...current, { name: '', contact: '' }] });
    };

    const handleLabourerChange = (index: number, field: 'name' | 'contact', value: string) => {
        const current = [...(newReport.labourers || [])];
        current[index] = { ...current[index], [field]: value };
        setNewReport({ ...newReport, labourers: current });
    };

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!newReport.date || !newReport.centreName || !newReport.purpose) {
                showToast("Please fill in all required fields", 'error');
                return;
            }

            await SchoolsStore.addReport({
                ...newReport,
                eventId: newReport.eventId || reportEventId,
                submittedBy: currentUser.name,
                submittedAt: new Date().toISOString()
            } as Omit<SchoolOutreachReport, 'id'>);

            showToast("Report submitted successfully");
            setIsAddingReport(false);
            setNewReport({ date: new Date().toISOString().split('T')[0], labourers: [] });
            loadReports(reportEventId);
        } catch (error) {
            console.error("Error submitting report:", error);
            showToast("Failed to submit report", 'error');
        }
    };

    const handleViewEvent = async (event: MinistryEvent) => {
        setSelectedEvent(event);
        try {
            // Use backend API instead of direct Supabase queries.
            // Direct Supabase queries are blocked by RLS policies for the anon key
            // on pickup_stations and vehicles tables.
            const passengers = await apiFetch(`/events/${event.id}/passengers?category=Student`);
            setEventPassengers(Array.isArray(passengers) ? passengers : []);
        } catch (error) {
            console.error("Error fetching event details:", error);
            showToast("Failed to load student list. Please try again.", 'error');
            setEventPassengers([]);
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
            'Coordinator': (p as any).vehicleCoordinator,
            'Coord Contact': (p as any).vehicleCoordinatorContact,
            'Driver Name': (p as any).vehicleDriver,
            'Driver Contact': (p as any).vehicleContact,
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        XLSX.writeFile(wb, `${selectedEvent.title}_Students.xlsx`);
    };

    const handlePrintAllManifests = async () => {
        if (!selectedEvent || eventPassengers.length === 0) return;

        // Group passengers by Vehicle
        const vehicleGroups: { [key: string]: typeof eventPassengers } = {};
        const vehicleDetails: { [key: string]: { numberPlate: string, driver: string, contact: string, coordinator: string, stationName: string } } = {};

        eventPassengers.forEach((p: any) => {
            const vId = p.vehicle_id || 'unknown';
            if (!vehicleGroups[vId]) {
                vehicleGroups[vId] = [];
                vehicleDetails[vId] = {
                    numberPlate: p.vehicleNumberPlate || 'Unknown',
                    driver: p.vehicleDriver || '',
                    contact: p.vehicleContact || '',
                    coordinator: p.vehicleCoordinator || '',
                    stationName: p.vehicleStationName || 'Unknown Station'
                };
            }
            vehicleGroups[vId].push(p);
        });

        const eventDate = selectedEvent.date;
        const globalManifest = await ManifestStore.get(); // Fetch manifest for Logo

        const template = {
            title: `Batch Manifests - ${selectedEvent.title}`,
            style: `
                @media print {
                    @page { size: landscape; margin: 5mm; }
                    body { -webkit-print-color-adjust: exact; }
                    .page-break { page-break-after: always; break-after: page; display: block; height: 0; }
                }
                body { font-family: 'Arial', sans-serif; font-size: 10px; margin: 0; padding: 0; }
                .header-wrapper { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; border-bottom: 2px solid black; padding-bottom: 5px; height: 80px; overflow: hidden; white-space: nowrap; }
                .logo-container { width: 80px; text-align: left; height: 70px; display: flex; align-items: center; }
                .main-title { text-align: center; flex: 1; }
                .main-title h1 { font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; line-height: 1.2; }
                .main-title h2 { font-size: 14px; font-weight: bold; margin: 2px 0 0 0; text-transform: uppercase; color: #333; line-height: 1.2; }
                
                .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 11px; font-weight: bold; table-layout: fixed; }
                .meta-table td { padding: 2px 5px; border: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .meta-label { text-transform: uppercase; }
                .meta-value { border-bottom: 1px solid black; min-width: 150px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

                table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
                table.data-table th, table.data-table td { border: 1px solid black; padding: 4px; text-align: left; height: 22px; vertical-align: middle; }
                table.data-table th { background-color: white; font-weight: 900; text-align: center; text-transform: uppercase; font-size: 10px; }
                .center { text-align: center; }
                
                .footer-consent { display: flex; gap: 20px; font-size: 9px; line-height: 1.2; margin-top: 5px; }
                .col-left, .col-right { flex: 1; text-align: justify; }
                .col-left h4 { margin: 4px 0 2px 0; font-size: 9px; text-decoration: underline; }
                .col-right h4 { margin: 4px 0 2px 0; font-size: 9px; }
                ol { margin: 2px 0; padding-left: 15px; }
                


                .page-container { 
                    page-break-after: always;
                    break-after: page;
                    height: 195mm; /* Safe buffer within 200mm available space */
                    overflow: hidden;
                    display: block; 
                    position: relative;
                }
            `,
            consent: `
                <div class="footer-consent">
                    <div class="col-left">
                        <strong>*CONSENT TO HOLD AND USE YOUR PERSONAL DATA</strong><br/>
                        By appending my signature on this form, I consent to Phaneroo Ministries International (hereinafter referred to as PMI) holding and using my personal information for the purposes only;
                        <ol>
                            <li>To keep you informed of events, services and other related communications from the ministry.</li>
                            <li>To share your contact details with our teams for experience sharing with the ministry.</li>
                            <li>To use your photograph(s) and video(s) taken during any of our events on our communication materials.</li>
                        </ol>
                        <br/>
                        <strong>CONSENT TO BE TRANSPORTED BY A PMI CHARTERED VEHICLE</strong><br/>
                        By appending my signature to this document I consent to be transported in a vehicle chartered by Phaneroo Ministries International (hereinafter referred to as PMI)
                        to........................................... and/ from........................................... for...........................................
                    </div>
                    <div class="col-right">
                        I also acknowledge the following;
                        <ol>
                            <li>To be transported in a vehicle chartered by PMI to and fro the ongoing PMI church service or event.</li>
                            <li>I acknowledge that PMI Transportation Department has taken reasonable measures to ensure that the vehicle is in proper mechanical condition, safe and that it has the right to establish rules and regulations regarding the use of this vehicle.</li>
                            <li>I agree to comply with any such rules and regulations, including but not limited to wearing a seatbelt and refraining from engaging in distracted driving behavior.</li>
                            <li>I absolve PMI of any responsibility that arises out of accidents, damage and/ or malfunctions to my person and/ or property whilst abode the said vehicle.</li>
                            <li>I understand that PMI reserves the right to admit anyone into the vehicle chartered by it.</li>
                            <li>I have read and understood the above terms and conditions and I voluntarily agree to the same and I so consent.</li>
                        </ol>
                    </div>
                </div>
            `
        };

        let htmlContent = `
            <html>
            <head>
                <title>${template.title}</title>
                <style>${template.style}</style>
            </head>
            <body>
        `;

        const createPage = (vId: string, chunk: any[], pageNum: number, totalPages: number) => {
            const vInfo = vehicleDetails[vId];
            const vehicleFirstTimers = chunk.filter(p => p.isFirstTime === 'Yes' || p.is_first_time === 'Yes').length;

            let rowsHtml = '';
            for (let i = 0; i < 15; i++) {
                const p = chunk[i];
                const no = (pageNum * 15) + (i + 1);

                if (p) {
                    const name = p.name ? p.name.toUpperCase() : '';
                    const contact = p.contact ? p.contact : '';
                    const residence = p.residence ? p.residence.toUpperCase() : '';
                    const gender = p.gender === 'Male' ? 'M' : 'F';
                    const school = p.school ? p.school.toUpperCase() : '';
                    const studentClass = p.studentClass ? p.studentClass.toUpperCase() : '';
                    const db = p.boardingType ? (p.boardingType === 'Day' ? 'D' : 'B') : '';

                    rowsHtml += `
                        <tr>
                            <td class="center">${no}.</td>
                            <td style="white-space: nowrap; overflow: hidden; max-width: 150px; font-size: 9px; text-overflow: ellipsis;">${name}</td>
                            <td class="center">${gender}</td>
                            <td>${contact}</td>
                            <td>${residence}</td>
                            <td>${school}</td>
                            <td class="center">${db}</td>
                            <td class="center">${studentClass}</td>
                            <td></td>
                            <td></td>
                        </tr>
                    `;
                } else {
                    rowsHtml += `<tr><td class="center">${no}.</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
                }
            }

            return `
                <div class="page-container ${pageNum < totalPages - 1 ? '' : ''}">
                    <div class="header-wrapper">
                         <div class="logo-container">
                            ${globalManifest?.logoUrl
                    ? `<img src="${globalManifest.logoUrl}" style="width: 50px; height: 50px; object-fit: contain;" alt="Logo" />`
                    : `<div style="width: 40px; height: 40px; background: black; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 8px;">LOGO</div>`
                }
                        </div>
                        <div class="main-title">
                            <h1>${selectedEvent.title}</h1>
                            <h2>SCHOOLS REGISTRATION FORM</h2>
                        </div>
                        <div class="logo-container"></div>
                    </div>

                    <table class="meta-table">
                        <tr>
                            <td style="width: 10%;">MANIFEST NAME:</td>
                            <td style="width: 30%; border-bottom: 1px solid black;">${vInfo.stationName}</td>
                            <td style="width: 10%;">REGION:</td>
                            <td style="width: 20%; border-bottom: 1px solid black;">CENTRAL</td>
                            <td style="width: 10%;">TOTAL:</td>
                            <td style="width: 20%; border-bottom: 1px solid black;">${chunk.length}</td>
                        </tr>
                         <tr>
                            <td>MANIFEST ID:</td>
                            <td style="border-bottom: 1px solid black;">CTL/EBB01R</td>
                            <td>EVENT DATE:</td>
                            <td style="border-bottom: 1px solid black;">${eventDate}</td>
                            <td>FIRST TIMERS:</td>
                            <td style="border-bottom: 1px solid black;">${vehicleFirstTimers}</td>
                        </tr>
                    </table>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 30px;">No.</th>
                                <th>FULL NAME</th>
                                <th style="width: 40px;">GENDER</th>
                                <th>CONTACT</th>
                                <th>PLACE OF RESIDENCE</th>
                                <th>NAME OF SCHOOL</th>
                                <th style="width: 60px;">DAY / BOARDING</th>
                                <th style="width: 50px;">CLASS</th>
                                <th style="width: 50px;">VACIST</th>
                                <th>CONSENT TO STORE YOUR INFO</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>

                    ${template.consent}
                </div>
            `;
        };

        const vehicleIds = Object.keys(vehicleGroups);
        vehicleIds.forEach((vId, index) => {
            const passengers = vehicleGroups[vId];
            const chunkSize = 15;
            const chunks = [];
            for (let i = 0; i < passengers.length; i += chunkSize) {
                chunks.push(passengers.slice(i, i + chunkSize));
            }

            chunks.forEach((chunk, i) => {
                htmlContent += createPage(vId, chunk, i, chunks.length);
            });
        });

        htmlContent += `</body></html>`;

        // Generate PDF
        const element = document.createElement('div');
        element.innerHTML = htmlContent;

        const opt = {
            margin: [5, 5, 5, 5] as [number, number, number, number],
            filename: `${selectedEvent.title.replace(/\s+/g, '_')}_Manifests.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, scrollY: 0, useCORS: true },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const },
            pagebreak: { mode: 'css', after: '.page-container' }
        };

        html2pdf().set(opt).from(element).save();
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
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center space-x-4 w-full md:w-auto">
                                        <h3 className="text-lg font-bold text-gray-800 whitespace-nowrap">Recent Reports</h3>
                                        <select
                                            value={reportEventId}
                                            onChange={(e) => setReportEventId(e.target.value)}
                                            className="p-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ministry-orange w-full md:w-64"
                                        >
                                            <option value="">All Events</option>
                                            {events.map(event => (
                                                <option key={event.id} value={event.id}>{event.title} ({event.date})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => setIsAddingReport(true)}
                                        className="flex items-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-ministry-orange transition-colors w-full md:w-auto justify-center"
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
                                        <label className="text-sm font-bold text-gray-700">Event Scoping</label>
                                        <select
                                            required
                                            value={newReport.eventId || reportEventId || ''}
                                            onChange={e => setNewReport({ ...newReport, eventId: e.target.value })}
                                            className="w-full p-3 border rounded-xl"
                                        >
                                            <option value="">Select Event...</option>
                                            {events.map(event => (
                                                <option key={event.id} value={event.id}>{event.title} ({event.date})</option>
                                            ))}
                                        </select>
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
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                                    <div className="flex items-center space-x-4">
                                        <button onClick={() => setSelectedEvent(null)} className="text-sm font-medium text-gray-500 hover:text-ministry-orange transition-colors flex items-center">
                                            <span className="mr-2">←</span> Back to Events
                                        </button>
                                        <div>
                                            <h3 className="text-xl font-bold text-ministry-text uppercase tracking-tight">
                                                {selectedEvent.title} <span className="font-light text-gray-400 normal-case tracking-normal">Students List</span>
                                            </h3>
                                        </div>
                                    </div>
                                    <button onClick={handleDownloadExcel} className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded font-medium flex items-center shadow-sm transition-colors">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Download Excel
                                    </button>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div
                                        onClick={() => setEventFilter('all')}
                                        className={`border rounded-xl p-4 flex flex-col justify-center bg-white shadow-sm cursor-pointer transition-all ${eventFilter === 'all' ? 'border-ministry-orange ring-1 ring-ministry-orange bg-orange-50/10' : 'border-gray-200 hover:border-ministry-orange/50'}`}
                                    >
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Students</div>
                                        <div className="text-3xl font-black text-gray-900">{eventPassengers.length}</div>
                                    </div>
                                    <div
                                        onClick={() => setEventFilter('first-timers')}
                                        className={`border rounded-xl p-4 flex flex-col justify-center bg-white shadow-sm cursor-pointer transition-all ${eventFilter === 'first-timers' ? 'border-red-500 ring-1 ring-red-500 bg-red-50/30' : 'border-gray-200 hover:border-red-300'}`}
                                    >
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">First Timers</div>
                                        <div className="text-3xl font-black text-red-500">{eventPassengers.filter(p => p.isFirstTime === 'Yes' || p.isFirstTime === true).length}</div>
                                    </div>
                                    <div
                                        onClick={() => setEventFilter('souls-won')}
                                        className={`border rounded-xl p-4 flex flex-col justify-center bg-white shadow-sm cursor-pointer transition-all ${eventFilter === 'souls-won' ? 'border-green-500 ring-1 ring-green-500 bg-green-50/30' : 'border-gray-200 hover:border-green-300'}`}
                                    >
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Souls Won</div>
                                        <div className="text-3xl font-black text-green-500">{eventPassengers.filter(p => p.soulWon).length}</div>
                                    </div>
                                    <button
                                        onClick={handlePrintAllManifests}
                                        className="border border-gray-200 rounded-xl p-4 flex flex-col justify-center items-center bg-white shadow-sm hover:bg-gray-50 transition-colors"
                                    >
                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Download PDF</span>
                                    </button>
                                </div>

                                {/* List */}
                                <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
                                    <table className="w-full text-left border-collapse bg-white">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider border-b border-gray-200">
                                                <th className="px-6 py-4">Name</th>
                                                <th className="px-6 py-4">School / Class</th>
                                                <th className="px-6 py-4">Contact</th>
                                                <th className="px-6 py-4">Vehicle</th>
                                                <th className="px-6 py-4">Coordinator</th>
                                                <th className="px-6 py-4 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {eventPassengers.filter(p => {
                                                if (eventFilter === 'first-timers') return p.isFirstTime === 'Yes' || p.isFirstTime === true;
                                                if (eventFilter === 'souls-won') return p.soulWon;
                                                return true;
                                            }).map((p, idx) => (
                                                <tr key={p.id || idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-gray-900">{p.name || '-'}</td>
                                                    <td className="px-6 py-4 text-gray-600">{p.school || '-'} <span className="text-xs text-gray-400 font-bold ml-1">• {p.studentClass || '-'}</span></td>
                                                    <td className="px-6 py-4 text-gray-500">{p.contact || '-'}</td>
                                                    <td className="px-6 py-4 text-gray-900">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{(p as any).vehicleNumberPlate || '-'}</span>
                                                            <span className="text-xs text-gray-500 font-medium">{(p as any).vehicleDriver || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{(p as any).vehicleCoordinator || 'N/A'}</span>
                                                            <span className="text-xs text-gray-500 font-medium">{(p as any).vehicleStationName || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex flex-col gap-1 items-center">
                                                            {(p.isFirstTime === 'Yes' || p.isFirstTime === true) && (
                                                                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded font-bold text-xs uppercase tracking-wide">
                                                                    First Timer
                                                                </span>
                                                            )}
                                                            {p.soulWon && (
                                                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded font-bold text-xs uppercase tracking-wide">
                                                                    Soul Won
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {eventPassengers.filter(p => {
                                                if (eventFilter === 'first-timers') return p.isFirstTime === 'Yes' || p.isFirstTime === true;
                                                if (eventFilter === 'souls-won') return p.soulWon;
                                                return true;
                                            }).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="text-center py-10 text-gray-400 bg-gray-50">
                                                            No students match the selected filter.
                                                        </td>
                                                    </tr>
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
