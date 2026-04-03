import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MinistryEvent, Passenger } from '../../types';
import { apiFetch } from '../../services/api';
import { ManifestStore } from '../../database/manifestStore';
import { useNotification } from '../ui/NotificationSystem';
import { Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

interface EventsTabProps {
    events: MinistryEvent[];
}

export const EventsTab: React.FC<EventsTabProps> = ({ events }) => {
    const { showToast } = useNotification();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedEventId = searchParams.get('eventId') || null;
    const selectedEvent = events.find(e => e.id === selectedEventId) || null;

    const [eventPassengers, setEventPassengers] = useState<Passenger[]>([]);
    const [eventFilter, setEventFilter] = useState<'all' | 'first-timers' | 'souls-won'>('all');

    const loadPassengers = async (eventId: string) => {
        try {
            const passengers = await apiFetch(`/events/${eventId}/passengers?category=Student`);
            setEventPassengers(Array.isArray(passengers) ? passengers : []);
        } catch (error) {
            console.error('Error fetching event details:', error);
            showToast('Failed to load student list. Please try again.', 'error');
            setEventPassengers([]);
        }
    };

    useEffect(() => {
        if (selectedEventId) loadPassengers(selectedEventId);
        else setEventPassengers([]);
    }, [selectedEventId]);

    const handleViewEvent = async (event: MinistryEvent) => {
        setSearchParams(prev => { prev.set('eventId', event.id); return prev; }, { replace: true });
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
                    height: 195mm; 
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
            <!DOCTYPE html>
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

            const logoHtml = globalManifest?.logoUrl
                ? `<img src="${globalManifest.logoUrl}" style="width: 50px; height: 50px; object-fit: contain;" alt="Logo" />`
                : `<div style="width: 40px; height: 40px; background: black; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 8px;">LOGO</div>`;

            return `
                <div class="page-container ${pageNum < totalPages - 1 ? '' : ''}">
                    <div class="header-wrapper">
                         <div class="logo-container">${logoHtml}</div>
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

    if (!selectedEvent) {
        return (
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
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => setSearchParams(prev => { prev.delete('eventId'); return prev; }, { replace: true })} className="text-sm font-medium text-gray-500 hover:text-ministry-orange transition-colors flex items-center">
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
    );
};
