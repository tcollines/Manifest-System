import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MinistryEvent } from '../types';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { apiFetch } from '../services/api';

interface CampusMinistryEventsProps {
    events: MinistryEvent[];
}

export default function CampusMinistryEvents({ events }: CampusMinistryEventsProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedEventId = searchParams.get('eventId') || null;
    const selectedEvent = events.find(e => e.id === selectedEventId) || null;

    const [eventPassengers, setEventPassengers] = useState<any[]>([]);
    const [isLoadingEvent, setIsLoadingEvent] = useState(false);
    const [filter, setFilter] = useState<'all' | 'first-timers' | 'souls-won'>('all');

    const loadPassengers = async (eventId: string) => {
        setIsLoadingEvent(true);
        try {
            const passengers = await apiFetch(`/events/${eventId}/passengers?category=Institution`);
            setEventPassengers(Array.isArray(passengers) ? passengers : []);
        } catch (error) {
            console.error('Error fetching event details:', error);
            setEventPassengers([]);
        } finally {
            setIsLoadingEvent(false);
        }
    };

    // Auto-load when eventId appears in URL (e.g. on page refresh)
    useEffect(() => {
        if (selectedEventId) loadPassengers(selectedEventId);
        else setEventPassengers([]);
    }, [selectedEventId]);

    // Filter to show only 'Event' (not 'Service') and sort newest first
    const filteredEvents = events
        .filter(event => event.type === 'Event')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleViewEvent = async (event: MinistryEvent) => {
        setSearchParams(prev => { prev.set('eventId', event.id); return prev; }, { replace: true });
        // loadPassengers is triggered by the useEffect above
    };

    if (selectedEvent) {
        const totalPassengers = eventPassengers.length;
        const firstTimers = eventPassengers.filter(p => p.isFirstTime).length;
        const soulsWon = eventPassengers.filter(p => p.soulWon).length;

        const displayedPassengers = eventPassengers.filter(p => {
            if (filter === 'first-timers') return p.isFirstTime;
            if (filter === 'souls-won') return p.soulWon;
            return true;
        });

        const handleDownloadExcel = () => {
            if (!selectedEvent || displayedPassengers.length === 0) return;

            const dataToExport = displayedPassengers.map(p => ({
                Name: p.name || 'N/A',
                Institution: p.institution_name || p.school || 'N/A',
                Contact: p.contact || 'N/A',
                'Vehicle Plate': p.vehicleNumberPlate || 'N/A',
                'Driver Name': p.vehicleDriver || 'N/A',
                'Coordinator': p.vehicleCoordinator || 'N/A',
                'Station': p.vehicleStationName || 'N/A',
                'First Timer': p.isFirstTime ? 'Yes' : 'No',
                'Soul Won': p.soulWon ? 'Yes' : 'No'
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Institution List");
            XLSX.writeFile(wb, `${selectedEvent.title}_Institution_Passengers.xlsx`);
        };

        const handleDownloadPDF = () => {
            if (!selectedEvent || displayedPassengers.length === 0) return;

            let rowsHtml = '';
            displayedPassengers.forEach((p, idx) => {
                rowsHtml += `
                    <tr>
                        <td class="center">${idx + 1}.</td>
                        <td>${p.name || 'N/A'}</td>
                        <td>${p.institution_name || p.school || 'N/A'}</td>
                        <td>${p.contact || 'N/A'}</td>
                        <td>${p.vehicleNumberPlate || 'N/A'}</td>
                        <td>${p.vehicleCoordinator || 'N/A'}</td>
                        <td>${(p.isFirstTime ? 'FT ' : '') + (p.soulWon ? 'SW' : '')}</td>
                    </tr>
                `;
            });

            const htmlContent = `
                <html>
                    <head>
                        <title>${selectedEvent.title} - Institution List</title>
                        <style>
                            body { font-family: Arial, sans-serif; font-size: 10px; }
                            h1 { text-align: center; font-size: 16px; margin-bottom: 20px; text-transform: uppercase; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                            th, td { border: 1px solid black; padding: 5px; text-align: left; }
                            th { background-color: #f3f4f6; font-weight: bold; }
                            .center { text-align: center; }
                        </style>
                    </head>
                    <body>
                        <h1>${selectedEvent.title} - Institution List</h1>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 30px;">No.</th>
                                    <th>Name</th>
                                    <th>Institution</th>
                                    <th>Contact</th>
                                    <th>Vehicle Plate</th>
                                    <th>Coordinator</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                    </body>
                </html>
            `;

            const element = document.createElement('div');
            element.innerHTML = htmlContent;

            const opt = {
                margin: [10, 10, 10, 10] as [number, number, number, number],
                filename: `${selectedEvent.title.replace(/\s+/g, '_')}_Institution_List.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
            };

            html2pdf().set(opt).from(element).save();
        };

        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">

                    {/* Header Controls */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => setSearchParams(prev => { prev.delete('eventId'); return prev; }, { replace: true })}
                            className="text-sm font-medium text-gray-500 hover:text-ministry-orange transition-colors flex items-center"
                        >
                            <span className="mr-2">←</span> Back to Events
                        </button>
                        <button onClick={handleDownloadExcel} className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded font-medium flex items-center shadow-sm transition-colors">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download Excel
                        </button>
                    </div>

                    {/* Title */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-black text-ministry-text uppercase tracking-tight">
                            {selectedEvent.title} <span className="font-light text-gray-400 normal-case tracking-normal">Institution List</span>
                        </h1>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div
                            onClick={() => setFilter('all')}
                            className={`border rounded-xl p-4 flex flex-col justify-center bg-white shadow-sm cursor-pointer transition-all ${filter === 'all' ? 'border-ministry-orange ring-1 ring-ministry-orange bg-orange-50/10' : 'border-gray-200 hover:border-ministry-orange/50'}`}
                        >
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Passengers</div>
                            <div className="text-3xl font-black text-gray-900">{totalPassengers}</div>
                        </div>
                        <div
                            onClick={() => setFilter('first-timers')}
                            className={`border rounded-xl p-4 flex flex-col justify-center bg-white shadow-sm cursor-pointer transition-all ${filter === 'first-timers' ? 'border-red-500 ring-1 ring-red-500 bg-red-50/30' : 'border-gray-200 hover:border-red-300'}`}
                        >
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">First Timers</div>
                            <div className="text-3xl font-black text-red-500">{firstTimers}</div>
                        </div>
                        <div
                            onClick={() => setFilter('souls-won')}
                            className={`border rounded-xl p-4 flex flex-col justify-center bg-white shadow-sm cursor-pointer transition-all ${filter === 'souls-won' ? 'border-green-500 ring-1 ring-green-500 bg-green-50/30' : 'border-gray-200 hover:border-green-300'}`}
                        >
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Souls Won</div>
                            <div className="text-3xl font-black text-green-500">{soulsWon}</div>
                        </div>
                        <button onClick={handleDownloadPDF} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-center items-center bg-white shadow-sm hover:bg-gray-50 transition-colors">
                            <div className="text-xs font-bold text-gray-700 uppercase tracking-widest">Download PDF</div>
                        </button>
                    </div>

                    {/* Table Section */}
                    {isLoadingEvent ? (
                        <div className="text-center py-10 text-gray-400">Loading passengers...</div>
                    ) : eventPassengers.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">No institution passengers recorded for this event.</div>
                    ) : (
                        <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
                            <table className="w-full text-left border-collapse bg-white">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider border-b border-gray-200">
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Institution</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Vehicle</th>
                                        <th className="px-6 py-4">Coordinator</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {displayedPassengers.map((p, idx) => (
                                        <tr key={p.id || idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.name || '-'}</td>
                                            <td className="px-6 py-4 text-gray-600">{p.institution_name || p.school || '-'}</td>
                                            <td className="px-6 py-4 text-gray-500">{p.contact || '-'}</td>
                                            <td className="px-6 py-4 text-gray-900">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{p.vehicleNumberPlate || '-'}</span>
                                                    <span className="text-xs text-gray-500 font-medium">{p.vehicleDriver || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-900">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{p.vehicleCoordinator || '-'}</span>
                                                    <span className="text-xs text-gray-500 font-medium">{p.vehicleStationName || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col gap-1 items-center">
                                                    {p.isFirstTime && (
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
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-ministry-text">Ministry Events</h1>
                    <p className="text-ministry-muted mt-2">View institution engagement and passenger details for special events</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEvents.map(event => (
                        <div key={event.id} className="bg-gray-50 border border-gray-100 p-5 rounded-xl hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewEvent(event)}>
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${event.type === 'Service' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {event.type}
                                </span>
                                <span className="text-xs text-gray-400 font-medium">{new Date(event.date).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-bold text-ministry-text mb-1 truncate" title={event.title}>{event.title}</h4>
                            <p className="text-sm text-gray-500 line-clamp-2">{event.description || 'No description provided.'}</p>
                        </div>
                    ))}
                    {filteredEvents.length === 0 && (
                        <div className="col-span-1 border border-dashed border-gray-300 md:col-span-2 lg:col-span-3 text-center py-20 text-gray-400 font-medium rounded-xl">
                            No events available to display.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
