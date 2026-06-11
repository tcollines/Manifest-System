import React from 'react';
import { AlertTriangle, LocateFixed } from 'lucide-react';
import EventDetailsModal from '../../../components/EventDetailsModal';
import PhoneInput from '../../../components/PhoneInput';
import NumberPlateInput from '../../../components/NumberPlateInput';
import ManualCountModal from '../../../components/ManualCountModal';
import { validateDriverIdentity } from '../../../utils';
import { useRegistration } from '../RegistrationContext';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const RegistrationModals: React.FC = () => {
    const {
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        eventToDelete,
        setEventToDelete,
        selectedMemberIds,
        deletePassword,
        setDeletePassword,
        confirmDelete,
        isChildCountModalOpen,
        setIsChildCountModalOpen,
        selectedService,
        handleUpdateManualCount,
        isAddEventOpen,
        setIsAddEventOpen,
        eventFormType,
        eventForm,
        setEventForm,
        handleAddEvent,
        isSubmittingEvent,
        showHighlights,
        setShowHighlights,
        highlightEvent,
        setHighlightEvent,
        isAddStationOpen,
        setIsAddStationOpen,
        stationForm,
        setStationForm,
        handleAddStation,
        isAddVehicleOpen,
        setIsAddVehicleOpen,
        vehicleForm,
        setVehicleForm,
        handleAddVehicle,
        coordinators,
        selectedStation,
        isAddPassengerOpen,
        setIsAddPassengerOpen,
        passengerForm,
        setPassengerForm,
        handleAddPassenger,
        selectedVehicle,
        isAddChildrenOpen,
        setIsAddChildrenOpen,
        childrenForm,
        setChildrenForm,
        handleUpdateChildrenCount,
        isAddEntrantOpen,
        setIsAddEntrantOpen,
        newEntrant,
        setNewEntrant,
        handleAddExtraEntrant,
    } = useRegistration();

    const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: 'AIzaSyCZSpPjUuv2sILESSb2yqYNxhzr9CfCtzs' });

    // Reconstruct the initial forms to reset correctly on close
    const initialStationForm = {
        name: '',
        location: '',
        coordinatorName: '',
        coordinatorContact: '',
        entrantName: '',
        entrantContact: '',
        entrantUsername: '',
        entrantPassword: '',
        id: ''
    };

    return (
        <>
            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-200">
                        <div className="flex items-center space-x-3 mb-6 text-red-600">
                            <AlertTriangle className="w-8 h-8" />
                            <h3 className="text-xl font-bold">{eventToDelete ? 'Delete Event/Service?' : 'Delete Members?'}</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            {eventToDelete ? (
                                <>
                                    You are about to PERMANENTLY delete <span className="font-bold text-gray-900">{eventToDelete.title}</span>.
                                    <br /><br />
                                    This includes all pickup stations, vehicles, and passenger manifests.
                                </>
                            ) : (
                                <>
                                    You are about to delete <span className="font-bold text-gray-900">{selectedMemberIds.size}</span> members from the database.
                                    This action cannot be undone.
                                </>
                            )}
                        </p>
                        <div className="space-y-2 mb-6">
                            <label className="text-sm font-bold text-gray-700">Enter Admin/Head Password to Confirm</label>
                            <input
                                type="password"
                                autoComplete="new-password"
                                autoFocus
                                value={deletePassword}
                                onChange={e => setDeletePassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                placeholder="Password"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setIsDeleteModalOpen(false); setDeletePassword(''); setEventToDelete(null); }}
                                className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Count Modal */}
            <ManualCountModal
                isOpen={isChildCountModalOpen}
                onClose={() => setIsChildCountModalOpen(false)}
                onConfirm={handleUpdateManualCount}
                initialCount={selectedService?.stats?.manualChildrenCount || 0}
            />

            {/* Add Service / Plan Event Modal */}
            {isAddEventOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {eventFormType === 'Service' ? 'Schedule New Service' : 'Plan New Event'}
                            </h3>
                            <button
                                onClick={() => setIsAddEventOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                            >✕</button>
                        </div>
                        <form onSubmit={handleAddEvent} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">Title <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    value={eventForm.title}
                                    onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange"
                                    placeholder={eventFormType === 'Service' ? 'e.g. Sunday Service' : 'e.g. Youth Conference'}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">Date <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="date"
                                        value={eventForm.date}
                                        onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">Time</label>
                                    <input
                                        type="time"
                                        value={eventForm.time}
                                        onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">Location Name</label>
                                <input
                                    value={eventForm.locationName || eventForm.location}
                                    onChange={e => setEventForm({ ...eventForm, locationName: e.target.value, location: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange"
                                    placeholder="e.g. EMF Grounds"
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">Select Location on Map</label>
                                <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 relative">
                                    {isLoaded ? (
                                        <>
                                            <GoogleMap
                                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                                center={eventForm.lat && eventForm.lng ? { lat: eventForm.lat, lng: eventForm.lng } : { lat: 0.347596, lng: 32.582520 }}
                                                zoom={eventForm.lat ? 15 : 11}
                                                onClick={(e) => {
                                                    if (e.latLng) {
                                                        setEventForm({ ...eventForm, lat: e.latLng.lat(), lng: e.latLng.lng() });
                                                    }
                                                }}
                                                options={{ mapTypeId: 'roadmap', streetViewControl: false, mapTypeControl: false }}
                                            >
                                                {eventForm.lat && eventForm.lng && (
                                                    <Marker position={{ lat: eventForm.lat, lng: eventForm.lng }} />
                                                )}
                                            </GoogleMap>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (navigator.geolocation) {
                                                        navigator.geolocation.getCurrentPosition(
                                                            (position) => setEventForm({ ...eventForm, lat: position.coords.latitude, lng: position.coords.longitude }),
                                                            (error) => console.error("Error getting location", error)
                                                        );
                                                    }
                                                }}
                                                className="absolute bottom-4 right-14 bg-white p-2.5 rounded-full shadow-lg hover:bg-gray-50 border border-gray-200 transition-colors z-10 text-gray-700 focus:outline-none"
                                                title="Go to my location"
                                            >
                                                <LocateFixed className="w-5 h-5 text-gray-600" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">Loading Map...</div>
                                    )}
                                </div>
                                {eventForm.lat && eventForm.lng && (
                                    <p className="text-xs text-gray-500 mt-1">Coordinates: {eventForm.lat.toFixed(6)}, {eventForm.lng.toFixed(6)}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">Description</label>
                                <textarea
                                    rows={3}
                                    value={eventForm.description}
                                    onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange resize-none"
                                    placeholder="Optional notes..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddEventOpen(false)}
                                    className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                                >Cancel</button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingEvent}
                                    className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-colors ${
                                        isSubmittingEvent ? 'bg-orange-400 cursor-not-allowed' : 'bg-ministry-orange hover:bg-orange-600'
                                    }`}
                                >
                                    {isSubmittingEvent ? 'Scheduling...' : (eventFormType === 'Service' ? 'Schedule Service' : 'Create Event')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Event Highlights Modal */}
            <EventDetailsModal
                isOpen={showHighlights}
                onClose={() => { setShowHighlights(false); setHighlightEvent(null); }}
                event={highlightEvent}
            />

            {/* Add / Edit Pickup Station Modal */}
            {isAddStationOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {stationForm.id ? 'Edit Pickup Station' : 'Add Pickup Station'}
                            </h3>
                            <button
                                onClick={() => { setIsAddStationOpen(false); setStationForm(initialStationForm); }}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                            >✕</button>
                        </div>
                        <form onSubmit={handleAddStation} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">Station Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    value={stationForm.name}
                                    onChange={e => setStationForm({ ...stationForm, name: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange"
                                    placeholder="e.g. Kampala Road Station"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">Location / Area</label>
                                <input
                                    value={stationForm.location}
                                    onChange={e => setStationForm({ ...stationForm, location: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange"
                                    placeholder="e.g. Near Kampala Bus Park"
                                />
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Data Entrant Credentials (Required)</p>
                                <div className="space-y-3">
                                    <input
                                        required
                                        value={stationForm.entrantName}
                                        onChange={e => setStationForm({ ...stationForm, entrantName: e.target.value })}
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange text-sm"
                                        placeholder="Entrant Full Name"
                                    />
                                    <PhoneInput
                                        value={stationForm.entrantContact}
                                        onChange={(val: string) => setStationForm({ ...stationForm, entrantContact: val })}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            required
                                            autoComplete="off"
                                            value={stationForm.entrantUsername}
                                            onChange={e => setStationForm({ ...stationForm, entrantUsername: e.target.value })}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange text-sm"
                                            placeholder="Username"
                                        />
                                        <input
                                            required
                                            type="password"
                                            autoComplete="new-password"
                                            value={stationForm.entrantPassword}
                                            onChange={e => setStationForm({ ...stationForm, entrantPassword: e.target.value })}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange text-sm"
                                            placeholder="Password"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => { setIsAddStationOpen(false); setStationForm(initialStationForm); }}
                                    className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                                >Cancel</button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl font-bold text-white bg-ministry-orange hover:bg-orange-600 shadow-md transition-colors"
                                >
                                    {stationForm.id ? 'Save Changes' : 'Add Station'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Add Extra Data Entrant Modal */}
            {isAddEntrantOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Add Data Entrant</h3>
                            <button
                                onClick={() => { setIsAddEntrantOpen(false); setNewEntrant({ name: '', username: '', password: '', contact: '' }); }}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                            >✕</button>
                        </div>
                        <form onSubmit={handleAddExtraEntrant} autoComplete="off" className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">Full Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    value={newEntrant.name}
                                    onChange={e => setNewEntrant({ ...newEntrant, name: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange text-sm"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">Contact</label>
                                <PhoneInput
                                    value={newEntrant.contact || ''}
                                    onChange={(val: string) => setNewEntrant({ ...newEntrant, contact: val })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">Username <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    autoComplete="new-username"
                                    value={newEntrant.username}
                                    onChange={e => setNewEntrant({ ...newEntrant, username: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange text-sm"
                                    placeholder="Username"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700">Password <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="password"
                                    autoComplete="new-password"
                                    value={newEntrant.password}
                                    onChange={e => setNewEntrant({ ...newEntrant, password: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-ministry-orange text-sm"
                                    placeholder="Password"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => { setIsAddEntrantOpen(false); setNewEntrant({ name: '', username: '', password: '', contact: '' }); }}
                                    className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                                >Cancel</button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl font-bold text-white bg-ministry-orange hover:bg-orange-600 shadow-md transition-colors"
                                >
                                    Add Entrant
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Add / Edit Vehicle Modal */}
            {isAddVehicleOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto border border-gray-200">
                        <h3 className="text-xl font-bold mb-4 text-gray-900">{vehicleForm.id ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
                        <form onSubmit={handleAddVehicle} className="space-y-4">

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Vehicle Coordinator</label>
                                <select
                                    required
                                    value={vehicleForm.coordinator || ''}
                                    onChange={e => setVehicleForm({ ...vehicleForm, coordinator: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-ministry-blue"
                                >
                                    <option value="">Select Coordinator</option>
                                    {coordinators
                                        .filter((coord: any) =>
                                            coord.eventId === selectedStation?.eventId &&
                                            (!coord.stationId || coord.stationId === selectedStation?.id)
                                        )
                                        .map((coord: any) => (
                                            <option key={coord.id} value={coord.name}>
                                                {coord.name} ({coord.username})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Driver Name</label>
                                    <input
                                        required
                                        value={vehicleForm.driverName}
                                        onChange={e => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-ministry-blue"
                                        placeholder="Full Name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-sm font-bold text-gray-700">Driver NIN / Permit No.</label>
                                        {vehicleForm.driverNin && (
                                            <div className={`w-3 h-3 rounded-full ${validateDriverIdentity(vehicleForm.driverNin).valid ? 'bg-green-500' : 'bg-red-500'}`} title={validateDriverIdentity(vehicleForm.driverNin).error || "Valid ID"} />
                                        )}
                                    </div>
                                    <input
                                        required
                                        value={vehicleForm.driverNin}
                                        onChange={e => {
                                            let val = e.target.value.toUpperCase();
                                            if (val.startsWith('C') && val.length > 14) {
                                                return; // Ignore input if it exceeds 14 chars for NINs
                                            }
                                            setVehicleForm({ ...vehicleForm, driverNin: val })
                                        }}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-ministry-blue uppercase"
                                        placeholder="NIN or Permit Number"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Driver Contact</label>
                                <PhoneInput value={vehicleForm.driverContact} onChange={(val: string) => setVehicleForm({ ...vehicleForm, driverContact: val })} />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Number Plate</label>
                                <NumberPlateInput
                                    value={vehicleForm.number_plate}
                                    onChange={(val: string) => setVehicleForm({ ...vehicleForm, number_plate: val })}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Vehicle Type</label>
                                <select value={vehicleForm.type} onChange={e => setVehicleForm({ ...vehicleForm, type: e.target.value as any })} className="w-full p-3 border border-gray-200 rounded-xl bg-white outline-none focus:border-ministry-blue">
                                    {['Car', 'Taxi', 'Coaster', 'Bus'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => setIsAddVehicleOpen(false)} className="px-4 py-2 text-gray-600 font-bold">Cancel</button>
                                <button type="submit" className="px-6 py-3 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange transition-colors">
                                    {vehicleForm.id ? 'Update Vehicle' : 'Register Vehicle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Passenger Edit / Add Modal */}
            {isAddPassengerOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200">
                        <div className="bg-gray-50 border-b border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {passengerForm.category === 'Student' ? 'Add Student' : passengerForm.category === 'Institution' ? 'Add Institution' : 'Add Member'} to Vehicle
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Vehicle: {selectedVehicle?.number_plate}</p>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            {!selectedVehicle ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministry-orange"></div>
                                   <p className="text-gray-500 font-medium">Validating session context...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleAddPassenger} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-bold text-gray-700">Full Name <span className="text-red-500">*</span></label>
                                        <input required value={passengerForm.name} onChange={e => setPassengerForm({ ...passengerForm, name: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:border-ministry-orange transition-colors" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-gray-700">Gender <span className="text-red-500">*</span></label>
                                        <select value={passengerForm.gender} onChange={e => setPassengerForm({ ...passengerForm, gender: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:border-ministry-orange">
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-gray-700">Contact <span className="text-red-500">*</span></label>
                                        <PhoneInput value={passengerForm.contact} onChange={(val: string) => setPassengerForm({ ...passengerForm, contact: val })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-gray-700">Residence <span className="text-red-500">*</span></label>
                                        <input required value={passengerForm.residence} onChange={e => setPassengerForm({ ...passengerForm, residence: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl focus:border-ministry-orange tracking-tight" />
                                    </div>
                                </div>

                                {passengerForm.category === 'Student' && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-gray-700">Contact Type</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 flex-1 justify-center">
                                                <input
                                                    type="radio"
                                                    name="contactType"
                                                    value="Personal"
                                                    checked={!(passengerForm as any).isParentContact}
                                                    onChange={() => setPassengerForm((prev: any) => { const copy = { ...prev }; delete (copy as any).isParentContact; return copy; })}
                                                    className="form-radio text-ministry-orange focus:ring-ministry-orange"
                                                />
                                                <span className="text-sm font-medium">Personal Contact</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 flex-1 justify-center">
                                                <input
                                                    type="radio"
                                                    name="contactType"
                                                    value="Parent"
                                                    checked={(passengerForm as any).isParentContact === true}
                                                    onChange={() => setPassengerForm((prev: any) => ({ ...prev, isParentContact: true } as any))}
                                                    className="form-radio text-ministry-orange focus:ring-ministry-orange"
                                                />
                                                <span className="text-sm font-medium">Parent Contact</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-gray-700">Are you going with us for the first time?</label>
                                    <select value={passengerForm.isFirstTime} onChange={e => setPassengerForm({ ...passengerForm, isFirstTime: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:border-ministry-orange">
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                </div>

                                {passengerForm.category === 'Student' && (
                                    <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-200 mt-2">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Student Details</h4>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-gray-700">School Name</label>
                                            <input value={passengerForm.school} onChange={e => setPassengerForm({ ...passengerForm, school: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-white" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-bold text-gray-700">Class</label>
                                                <input value={passengerForm.studentClass} onChange={e => setPassengerForm({ ...passengerForm, studentClass: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-white" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-bold text-gray-700">Section</label>
                                                <select value={passengerForm.boardingType} onChange={e => setPassengerForm({ ...passengerForm, boardingType: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-white">
                                                    <option value="Day">Day</option>
                                                    <option value="Boarding">Boarding</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {passengerForm.category === 'Institution' && (
                                    <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-200 mt-2">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Institution Details</h4>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-gray-700">Institution Name</label>
                                            <input value={passengerForm.school} onChange={e => setPassengerForm({ ...passengerForm, school: e.target.value })} className="w-full p-3 border border-gray-200 rounded-xl bg-white" placeholder="e.g. Nkumba University" />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={() => setIsAddPassengerOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                    <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-white bg-ministry-orange hover:bg-orange-600 shadow-md transition-colors">
                                        {passengerForm.id ? "Update Passenger" : "Add to Vehicle"}
                                    </button>
                                </div>
                            </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Children Count Modal */}
            {isAddChildrenOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl border border-gray-200">
                        <h3 className="text-xl font-bold mb-2">Children Count</h3>
                        <p className="text-sm text-gray-500 mb-6">Updating children count for {selectedVehicle?.number_plate}</p>
                        {!selectedVehicle ? (
                            <div className="flex justify-center py-6">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ministry-orange"></div>
                            </div>
                        ) : (
                        <form onSubmit={handleUpdateChildrenCount} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Total Children Accompanied</label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={childrenForm.count}
                                    onChange={e => setChildrenForm({ ...childrenForm, count: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full p-4 border rounded-xl bg-gray-50 text-2xl text-center font-black !outline-none focus:border-ministry-orange appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none shadow-inner"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end pt-2 gap-3">
                                <button type="button" onClick={() => setIsAddChildrenOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-ministry-text text-white font-bold rounded-xl hover:bg-gray-800 shadow-md">Save Count</button>
                            </div>
                        </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default RegistrationModals;
