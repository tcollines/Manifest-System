import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { isEventLocked } from '../../../utils';
import {
    Calendar, CalendarPlus, ArrowLeft, Users, UserPlus, Search, CheckCircle,
    Trash2, Download, Baby, Heart, Lock, Copy, Save, Ticket, CreditCard,
    Upload, Plus, MapPin, Building2, GraduationCap, ChevronRight, Bus,
    Printer, ShieldCheck, Settings, LayoutList, Edit2
} from 'lucide-react';
import { useRegistration } from '../RegistrationContext';

const EventsTab: React.FC = () => {
    const {
        currentUser,
        isLogisticsRole,
        canDeleteLogistics,
        isLogisticsInitializing,
        viewMode,
        logisticsEvents,
        selectedLogisticsEvent,
        selectedStation,
        stations,
        vehicles,
        stationEntrants,
        passengers,
        selectedVehicle,
        setEventFormType,
        setIsAddEventOpen,
        setHighlightEvent,
        setShowHighlights,
        setSelectedLogisticsEvent,
        handleDeleteEvent,
        handleBackLogistics,
        setIsAddStationOpen,
        handleSelectStation,
        setVehicleForm,
        setIsAddVehicleOpen,
        setStationForm,
        handleDeleteStation,
        setIsAddEntrantOpen,
        setSelectedVehicle,
        setChildrenForm,
        setIsAddChildrenOpen,
        handlePrintManifest,
        handleApproveVehicle,
        openAddMember,
        openAddStudent,
        openAddInstitution,
        setPassengerForm,
        setIsAddPassengerOpen,
        handleDeleteVehicle,
        handleDeletePassenger
    } = useRegistration();

    const [searchParams] = useSearchParams();
    const urlStationId = searchParams.get('stationId');
    const urlEventId = searchParams.get('eventId');
    
    // Determine if we are waiting for a deep link to load its data
    const isWaitingForStation = !!urlStationId && !selectedStation;
    const isWaitingForEvent = !!urlEventId && !selectedLogisticsEvent && !urlStationId;
    
    const isLoading = isLogisticsInitializing || isWaitingForStation || isWaitingForEvent;

    return (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex flex-col gap-6 py-6 w-full animate-pulse">
                {/* Header Skeleton */}
                <div className="h-10 bg-gray-200 rounded-xl w-1/3 mb-2"></div>
                {/* Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="h-32 bg-gray-100 rounded-2xl border border-gray-200"></div>
                  <div className="h-32 bg-gray-100 rounded-2xl border border-gray-200"></div>
                  <div className="h-32 bg-gray-100 rounded-2xl border border-gray-200"></div>
                </div>
                {/* Table Skeleton */}
                <div className="h-64 bg-gray-100 rounded-2xl border border-gray-200 mt-2"></div>
                {/* Subtitle */}
                <div className="text-center mt-4">
                  <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
                </div>
              </div>
            ) : (
              <>
                {/* LEVEL 1: EVENTS LIST */}
                {!selectedLogisticsEvent && !selectedStation && viewMode !== 'station-detail' && (
                  <div className="animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Manage Events</h3>
                      {!isLogisticsRole && (
                        <button
                          onClick={() => { setEventFormType('Event'); setIsAddEventOpen(true); }}
                          className="flex items-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm font-bold text-sm"
                        >
                          <CalendarPlus className="w-4 h-4" />
                          <span>Plan Event</span>
                        </button>
                      )}
                    </div>
                    
                    {/* ── Mobile List View ─────────────────────────────────────── */}
                    <div className="md:hidden flex flex-col space-y-3">
                      {logisticsEvents.map(event => {
                          const isLocked = isEventLocked(event.date);
                          return (
                              <div key={`mobile-${event.id}`} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-ministry-orange/40 transition-all flex flex-col gap-3 shadow-sm">
                                  <div 
                                      className="flex justify-between items-center cursor-pointer"
                                      onClick={() => {
                                        if (isLocked) {
                                          setHighlightEvent(event);
                                          setShowHighlights(true);
                                        } else {
                                          setSelectedLogisticsEvent(event);
                                        }
                                      }}
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                              <Calendar className="w-5 h-5 text-gray-500" />
                                          </div>
                                          <div>
                                              <h4 className="text-[15px] font-bold text-ministry-text leading-tight">{event.title}</h4>
                                              <p className="text-xs text-gray-500 mt-0.5">{event.date} • {event.time}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center pl-2">
                                          {isLocked ? (
                                              <ChevronRight className="w-5 h-5 text-black" />
                                          ) : (
                                              <button 
                                                  onClick={(e) => { 
                                                      e.stopPropagation(); 
                                                      setSelectedLogisticsEvent(event); 
                                                  }} 
                                                  className="bg-black text-ministry-neon px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm"
                                              >
                                                  View
                                              </button>
                                          )}
                                      </div>
                                  </div>
                                  {currentUser.role === 'TeamLeader' && (
                                      <button
                                          onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event); }}
                                          className="w-full py-2 rounded-lg font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center border border-red-100 text-sm mt-1"
                                      >
                                          <Trash2 className="w-4 h-4 mr-2" /> Delete Event
                                      </button>
                                  )}
                              </div>
                          );
                      })}
                      {logisticsEvents.length === 0 && (
                          <div className="py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                              No special events found. Logistics for services are handled via Service Check-In if configured.
                          </div>
                      )}
                    </div>

                    {/* ── Desktop Grid View ────────────────────────────────────── */}
                    <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {logisticsEvents.map(event => (
                        <div key={event.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all group">
                          <div className="flex justify-between items-start mb-3">
                            <Calendar className="w-6 h-6 text-gray-400 group-hover:text-ministry-orange transition-colors" />
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-50 text-purple-600">
                              {event.type}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h4>
                          <p className="text-sm text-gray-500 mb-4">{event.date} • {event.time}</p>
                          <button
                            onClick={() => {
                              if (isEventLocked(event.date)) {
                                setHighlightEvent(event);
                                setShowHighlights(true);
                              } else {
                                setSelectedLogisticsEvent(event);
                              }
                            }}
                            className={`w-full py-2 rounded-lg font-bold transition-colors ${isEventLocked(event.date)
                              ? 'bg-gray-900 text-white hover:bg-black'
                              : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-ministry-text hover:text-white'
                              }`}
                          >
                            {isEventLocked(event.date) ? 'Preview Highlights' : 'View Stations'}
                          </button>

                          {currentUser.role === 'TeamLeader' && (
                            <button
                              onClick={() => handleDeleteEvent(event)}
                              className="mt-2 w-full py-2 rounded-lg font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center border border-red-100"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Event
                            </button>
                          )}
                        </div>
                      ))}
                      {logisticsEvents.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                          No special events found. Logistics for services are handled via Service Check-In if configured.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* LEVEL 2: STATION LIST (FOR SELECTED EVENT) */}
                {selectedLogisticsEvent && !selectedStation && (
                  <div className="animate-in slide-in-from-right-4">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center space-x-3">
                        <button onClick={handleBackLogistics} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                          <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{selectedLogisticsEvent.title}</h3>
                          <p className="text-sm text-gray-500">Pickup Stations Management</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsAddStationOpen(true)}
                        className="w-10 h-10 flex items-center justify-center bg-gray-900 hover:bg-black rounded-xl shadow-sm transition-colors shrink-0"
                        title="Add Pickup Station"
                      >
                        <Plus className="w-6 h-6 text-[#CCFF00]" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {stations.filter(s => s.eventId === selectedLogisticsEvent.id).map(station => (
                        <div key={station.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-50 rounded-lg shrink-0"><MapPin className="w-5 h-5 text-blue-600" /></div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-base font-bold text-gray-900 leading-tight truncate">{station.name}</h4>
                              <p className="text-xs text-gray-500 truncate">{station.location}</p>
                            </div>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded font-bold text-gray-600 shrink-0 whitespace-nowrap">
                              {vehicles.filter(v => v.stationId === station.id).length} Vehicles
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded">
                            <UserPlus className="w-3 h-3 mr-2" />
                            Coord: {station.coordinatorName || 'None'}
                          </div>
                          <button
                            onClick={() => handleSelectStation(station)}
                            className="w-full bg-white border border-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                          >
                            View Station Details
                          </button>
                        </div>
                      ))}
                      {stations.filter(s => s.eventId === selectedLogisticsEvent.id).length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                          No pickup stations added for this event yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* LEVEL 3: STATION DETAILS (VEHICLES & ENTRANTS) */}
                {selectedStation && !selectedVehicle && (
                  <div className="animate-in slide-in-from-right-4 space-y-4">

                    {/* Mobile-Optimized Station Header Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-4 md:p-6">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {!isLogisticsRole && (
                                <button onClick={handleBackLogistics} className="p-1 -ml-2 hover:bg-gray-100 rounded-full text-gray-500">
                                  <ArrowLeft className="w-5 h-5" />
                                </button>
                              )}
                              <span className="text-xs font-bold uppercase tracking-wider text-ministry-orange">
                                {selectedLogisticsEvent?.title || 'Event'}
                              </span>
                            </div>
                            <h2 className="text-xl md:text-3xl font-bold text-gray-900 leading-tight">
                              {selectedStation.name}
                            </h2>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {selectedStation.location}
                            </p>
                          </div>

                          {/* Stats & Actions */}
                          <div className="flex flex-col items-end gap-3 shrink-0">
                            <div className="bg-green-50 border border-green-100 text-green-700 px-3 py-1.5 rounded-xl flex flex-col items-center min-w-[70px]">
                              <span className="text-[10px] font-bold uppercase">Registered</span>
                              <span className="text-xl font-bold leading-none">
                                {passengers.filter(p => vehicles.find(v => v.id === p.vehicleId)?.stationId === selectedStation.id).length}
                              </span>
                            </div>

                            <div className="flex flex-col gap-2 items-end">
                              {canDeleteLogistics && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      setStationForm({
                                        id: selectedStation.id,
                                        name: selectedStation.name,
                                        location: selectedStation.location,
                                        coordinatorName: selectedStation.coordinatorName || '',
                                        coordinatorContact: selectedStation.coordinatorContact || '',
                                        // Pre-fill first entrant if available
                                        entrantName: stationEntrants[0] ? stationEntrants[0].name : '',
                                        entrantContact: stationEntrants[0] ? stationEntrants[0].contact || '' : '',
                                        entrantUsername: stationEntrants[0] ? stationEntrants[0].username || '' : '',
                                        entrantPassword: stationEntrants[0] ? stationEntrants[0].password || '' : ''
                                      });
                                      setIsAddStationOpen(true);
                                    }}
                                    className="bg-gray-100 text-gray-700 p-2 rounded-xl hover:bg-gray-200 transition-colors"
                                    title="Edit Station"
                                   >
                                    <Settings className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleDeleteStation}
                                    className="bg-red-50 text-red-600 p-2 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                                    title="Delete Station"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              {isLogisticsRole && (
                                <button
                                  onClick={() => {
                                    setVehicleForm({
                                      number_plate: '',
                                      driverName: '',
                                      driverContact: '256',
                                      driverNin: '',
                                      type: 'Taxi',
                                      capacity: '',
                                      coordinator: '',
                                      id: ''
                                    });
                                    setIsAddVehicleOpen(true);
                                  }}
                                  className="flex items-center justify-center space-x-1 bg-ministry-orange text-white px-3 py-2 rounded-xl hover:bg-orange-600 shadow-md shadow-orange-200 transition-transform active:scale-95 font-bold text-sm"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span className="hidden md:inline">Add Vehicle</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Decorative element */}
                      <div className="h-1 w-full bg-gray-100">
                        <div className="h-full bg-ministry-orange w-1/3 rounded-r-full"></div>
                      </div>
                    </div>

                    {/* ENTRANT MANAGEMENT (ADMIN ONLY) */}
                    {!isLogisticsRole && (
                      <div className="mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-ministry-orange" />
                            Assigned Data Entrants
                          </h3>
                          <button
                            onClick={() => setIsAddEntrantOpen(true)}
                            className="w-10 h-10 flex items-center justify-center bg-gray-900 hover:bg-black rounded-xl shadow-sm transition-colors"
                            title="Add Data Entrant"
                          >
                            <Plus className="w-6 h-6 text-[#CCFF00]" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {stationEntrants.map(user => (
                            <div key={user.id} className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-ministry-neon text-black font-bold rounded-full flex items-center justify-center">
                                  {user.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-gray-900">{user.name}</p>
                                  <p className="text-xs text-gray-500">@{user.username}</p>
                                </div>
                              </div>
                              <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-bold">Active</div>
                            </div>
                          ))}
                          {stationEntrants.length === 0 && (
                            <div className="col-span-full py-4 text-center text-gray-400 text-sm italic">
                              No Data Entrants assigned.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* VEHICLE LIST */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Bus className="w-5 h-5 mr-2 text-ministry-orange" /> Registered Vehicles</h3>
                      {/* DEBUG: Vehicle List */}
                      {console.log("Rendering Vehicles:", {
                        totalVehicles: vehicles.length,
                        selectedStationId: selectedStation?.id,
                        filteredCount: vehicles.filter(v => v.stationId === selectedStation?.id).length,
                        sampleVehicle: vehicles[0]
                      })}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {vehicles.filter(v => String(v.stationId) === String(selectedStation.id)).map(vehicle => {
                          const vPassengers = passengers.filter(p => p.vehicleId === vehicle.id);
                          let statusColor = "bg-gray-100 text-gray-600";
                          let statusText = vehicle.currentStage || "Onboarding";

                          if (vehicle.currentStage === 'RegApproval') { statusColor = "bg-orange-100 text-orange-700"; }
                          else if (vehicle.currentStage === 'FinanceApproval') { statusColor = "bg-blue-100 text-blue-700"; }
                          else if (vehicle.currentStage === 'Transit') { statusColor = "bg-green-100 text-green-700"; }

                          return (
                            <div key={vehicle.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-ministry-orange/50 transition-all group">
                              <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-start">
                                <span className="font-mono font-bold text-xl text-gray-900">{vehicle.number_plate}</span>
                                <div className="text-right">
                                  <span className="text-[10px] font-bold uppercase bg-gray-50 border border-gray-200 px-2 py-1 rounded text-gray-500 block mb-1">{vehicle.type}</span>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColor}`}>
                                    {statusText}
                                  </span>
                                </div>
                              </div>
                              <div className="p-4">
                                <div className="mb-4 flex justify-between">
                                  <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Driver</p>
                                    <p className="font-bold text-gray-700">{vehicle.driverName}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-400 uppercase font-bold">Passengers</p>
                                    <div className="flex items-center justify-end text-blue-600 font-bold text-lg">
                                      <Users className="w-4 h-4 mr-1" />
                                      {vPassengers.length}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSelectedVehicle(vehicle)}
                                  className="w-full text-center bg-ministry-text text-white py-3 rounded-xl font-bold text-sm hover:bg-ministry-orange transition-colors flex items-center justify-center shadow-md active:scale-95"
                                >
                                  Manage Vehicle <ChevronRight className="w-4 h-4 ml-1" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {vehicles.filter(v => String(v.stationId) === String(selectedStation.id)).length === 0 && (
                          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                            No vehicles registered at this station yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* LEVEL 4: VEHICLE DETAILS (DETAILS) */}
                {selectedVehicle && (() => {
                  const isLocked = selectedVehicle.approvals?.registration === 'Approved';
                  return (
                    <div className="animate-in slide-in-from-right-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                        <div className="flex items-center space-x-3">
                          <button onClick={handleBackLogistics} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                          </button>
                          <div>
                            <h2 className="text-2xl font-bold font-mono text-ministry-text flex items-center flex-wrap gap-2">
                              {selectedVehicle.number_plate}
                              <span className={`text-xs px-2 py-1 rounded-full font-bold ${selectedVehicle.currentStage === 'FinanceApproval' ? 'bg-blue-100 text-blue-700' :
                                selectedVehicle.currentStage === 'RegApproval' ? 'bg-orange-100 text-orange-700' :
                                  selectedVehicle.currentStage === 'Transit' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                {selectedVehicle.currentStage || 'Onboarding'}
                              </span>
                            </h2>
                            <p className="text-sm text-gray-500">Vehicle Details & Statistics</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center justify-start lg:justify-end">
                          {(() => {

                            // Allow approval for Administrator, TeamLeader, and Lead
                            const canApprove = ['Administrator', 'TeamLeader', 'Head of Dept', 'Dept Admin'].includes(currentUser.role);

                            // Show button if authorized (either active or disabled state)
                            const isApproved = selectedVehicle.currentStage === 'FinanceApproval' || isLocked;

                            return (
                              <>
                                {isLogisticsRole ? (
                                  <button
                                    onClick={() => {
                                      setChildrenForm({ count: String(selectedVehicle.childrenCount || 0) });
                                      setIsAddChildrenOpen(true);
                                    }}
                                    disabled={isLocked}
                                    className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors shadow-sm font-bold ${isLocked
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-gray-800 text-white hover:bg-gray-900'
                                      }`}
                                  >
                                    <Baby className="w-4 h-4" />
                                    <span>Children Count</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={handlePrintManifest}
                                    className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors shadow-sm font-bold"
                                  >
                                    <Printer className="w-4 h-4" />
                                    <span>Print Vehicle</span>
                                  </button>
                                )}

                                {/* APPROVE BUTTON */}
                                {canApprove && (
                                  <button
                                    onClick={handleApproveVehicle}
                                    disabled={isApproved}
                                    className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors shadow-sm font-bold ${isApproved
                                      ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-200'
                                      : 'bg-green-600 text-white hover:bg-green-700'
                                      }`}
                                  >
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>{isApproved ? 'Approved (Finance)' : 'Approve Vehicle'}</span>
                                  </button>
                                )}

                                {/* Add Buttons: Only if not locked */}
                                {!isLocked ? (
                                  <>
                                    <button
                                      onClick={openAddMember}
                                      className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                                    >
                                      <UserPlus className="w-4 h-4" />
                                      <span>Add Member</span>
                                    </button>
                                    <button
                                      onClick={openAddStudent}
                                      className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-white border border-ministry-text text-ministry-text px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-bold"
                                    >
                                      <GraduationCap className="w-4 h-4" />
                                      <span>Add Student</span>
                                    </button>
                                    <button
                                      onClick={openAddInstitution}
                                      className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-white border border-ministry-text text-ministry-text px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-bold"
                                    >
                                      <Building2 className="w-4 h-4" />
                                      <span>Add Institution</span>
                                    </button>
                                  </>
                                ) : (
                                  // Locked State Indicator
                                  <div className="flex items-center space-x-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg font-bold border border-gray-200 cursor-not-allowed">
                                    <Lock className="w-4 h-4" />
                                    <span>Vehicle Locked ({selectedVehicle.currentStage})</span>
                                  </div>
                                )}

                                {/* LOGISTICS ACTIONS (Edit/Delete) - Moved to end for better layout flow */}
                                {canDeleteLogistics && (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => {
                                        setVehicleForm({
                                          number_plate: selectedVehicle.number_plate,
                                          driverName: selectedVehicle.driverName,
                                          driverContact: selectedVehicle.driverContact,
                                          driverNin: selectedVehicle.driverNin || '',
                                          type: selectedVehicle.type,
                                          capacity: '',
                                          coordinator: selectedVehicle.coordinator || '',
                                          id: selectedVehicle.id // Set ID for edit mode
                                        });
                                        setIsAddVehicleOpen(true);
                                      }}
                                      className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                                      title="Edit Vehicle"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={handleDeleteVehicle}
                                      className="bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-100"
                                      title="Delete Vehicle"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Total Passengers</p>
                          <p className="text-2xl font-bold text-ministry-text mt-1">{passengers.filter(p => p.vehicleId === selectedVehicle.id).length}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">First Timers</p>
                          <p className="text-2xl font-bold text-green-600 mt-1">{passengers.filter(p => p.vehicleId === selectedVehicle.id && p.isFirstTime === 'Yes').length}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Students</p>
                          <p className="text-2xl font-bold text-blue-600 mt-1">{passengers.filter(p => p.vehicleId === selectedVehicle.id && p.category === 'Student').length}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Institutions</p>
                          <p className="text-2xl font-bold text-purple-600 mt-1">{passengers.filter(p => p.vehicleId === selectedVehicle.id && p.category === 'Institution').length}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-ministry-orange">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Children</p>
                          <p className="text-2xl font-bold text-ministry-orange mt-1">{selectedVehicle.childrenCount || 0}</p>
                        </div>
                      </div>

                      {/* Manifest Table */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-white flex items-center">
                          <LayoutList className="w-4 h-4 mr-2 text-gray-500" />
                          <h4 className="font-bold text-gray-700 text-sm uppercase">Passenger Manifest</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                              <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Residence</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {passengers.filter(p => p.vehicleId === selectedVehicle.id).map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                                  <td className="px-6 py-4 text-sm">{p.category}</td>
                                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{p.contact}</td>
                                  <td className="px-6 py-4 text-sm text-gray-600">{p.residence}</td>
                                  <td className="px-6 py-4">
                                    {p.isFirstTime === 'Yes' ? (
                                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">New</span>
                                    ) : (
                                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">Member</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPassengerForm({
                                          ...p,
                                          id: p.id // Ensure ID is set for edit mode
                                        });
                                        setIsAddPassengerOpen(true);
                                      }}
                                      disabled={isLocked}
                                      className={`p-2 rounded-lg transition-colors mr-1 ${isLocked ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                      title={isLocked ? "Cannot edit locked vehicle" : "Edit Passenger"}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent any parent clicks
                                        handleDeletePassenger(p.id);
                                      }}
                                      disabled={isLocked}
                                      className={`p-2 rounded-lg transition-colors ${isLocked ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                      title={isLocked ? "Cannot remove from locked vehicle" : "Remove Passenger"}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {passengers.filter(p => p.vehicleId === selectedVehicle.id).length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No passengers recorded in this vehicle.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
    );
};

export default EventsTab;
