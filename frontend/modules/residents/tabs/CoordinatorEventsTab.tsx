/**
 * CoordinatorEventsTab
 *
 * Events grid → event detail confirmation list.
 * Coordinator can confirm/unconfirm which members are attending a given event.
 * Consumes shared state via useResidentCoordinator() — no props.
 */

import React from 'react';
import { useResidentCoordinator } from '../ResidentCoordinatorContext';
import { Calendar, ChevronRight, MapPin, Target, Users, CheckCircle2, Circle } from 'lucide-react';

const CoordinatorEventsTab: React.FC = () => {
    const {
        events, members, myResidence,
        selectedEvent, setSelectedEvent,
        confirmedPassengers, handleConfirmToggle,
    } = useResidentCoordinator();

    // ── Events grid ───────────────────────────────────────────────────────────
    if (!selectedEvent) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Ministry Events</h2>
                    <p className="text-sm text-gray-500">Select an event to build your confirmed list</p>
                </div>

                {/* ── Mobile List View ─────────────────────────────────────── */}
                <div className="md:hidden flex flex-col space-y-3">
                    {events.map(event => (
                        <div key={`mobile-${event.id}`} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-ministry-orange/40 transition-all flex flex-col gap-3 shadow-sm">
                            <div 
                                className="flex justify-between items-center cursor-pointer"
                                onClick={() => setSelectedEvent(event)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                        <Calendar className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-[15px] font-bold text-gray-900 leading-tight">{event.title}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">{event.date} • {event.location}</p>
                                    </div>
                                </div>
                                <div className="flex items-center pl-2">
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setSelectedEvent(event); 
                                        }} 
                                        className="bg-black text-ministry-neon px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm"
                                    >
                                        Build
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {events.length === 0 && (
                        <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">No Events Found</h3>
                            <p className="text-sm text-gray-500 mt-1">There are no upcoming events currently listed.</p>
                        </div>
                    )}
                </div>

                {/* ── Desktop Grid View ────────────────────────────────────── */}
                <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map(event => (
                        <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                    {event.type}
                                </span>
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">{event.title}</h3>
                            <div className="space-y-1 mt-3">
                                <div className="flex items-center text-sm text-gray-500">
                                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                    {event.date} {event.time && `• ${event.time}`}
                                </div>
                                {event.location && (
                                    <div className="flex items-center text-sm text-gray-500">
                                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                        {event.location}
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-sm font-medium text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                                    Build List <ChevronRight className="w-4 h-4 ml-1" />
                                </span>
                            </div>
                        </div>
                    ))}

                    {events.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">No Events Found</h3>
                            <p className="text-sm text-gray-500 mt-1">There are no upcoming events currently listed.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Event confirmation view ───────────────────────────────────────────────
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => setSelectedEvent(null)}
                        className="text-sm text-blue-600 flex items-center hover:underline mb-2"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Back to Events
                    </button>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-500" />
                        Confirmed List: {selectedEvent.title}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {selectedEvent.date} • {myResidence?.name}
                    </p>
                </div>
                {/* Confirmed counter */}
                <div className="flex flex-col items-end">
                    <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Confirmed</div>
                            <div className="text-xl font-bold text-gray-900 leading-none mt-1">
                                {confirmedPassengers.length} <span className="text-sm text-gray-400 font-normal">/ {members.length}</span>
                            </div>
                        </div>
                        <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center relative">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                            {confirmedPassengers.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Member confirmation list */}
            <div className="divide-y divide-gray-100">
                {members.map(member => {
                    const isConfirmed = confirmedPassengers.some(p => p.name === member.name);
                    return (
                        <div
                            key={member.id}
                            className={`p-4 sm:p-5 flex items-center justify-between transition-colors ${isConfirmed ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isConfirmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {member.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">{member.name}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mt-0.5 space-x-3">
                                        <span>{member.phone || 'No Phone'}</span>
                                        {member.gender && <span>• {member.gender}</span>}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleConfirmToggle(member)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-sm ${
                                    isConfirmed
                                        ? 'bg-green-500 text-white hover:bg-green-600 border border-transparent'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                            >
                                {isConfirmed ? (
                                    <><CheckCircle2 className="w-4 h-4" /> Confirmed</>
                                ) : (
                                    <><Circle className="w-4 h-4 text-gray-400" /> Confirm</>
                                )}
                            </button>
                        </div>
                    );
                })}

                {members.length === 0 && (
                    <div className="py-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No Members Found</h3>
                        <p className="text-sm text-gray-500 mt-1">Add members to this residency first before building a confirmed list.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoordinatorEventsTab;
