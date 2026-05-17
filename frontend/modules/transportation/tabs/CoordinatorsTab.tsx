/**
 * CoordinatorsTab
 *
 * Coordinator management tab for Transportation module.
 * Renders the coordinator list and the add-coordinator form.
 *
 * All data comes from useTransport() context — no props, no currentUser prop.
 */

import React, { useState } from 'react';
import { useTransport } from '../TransportContext';
import { isEventLocked } from '../../../utils';
import PhoneInput from '../../../components/PhoneInput';
import { LogisticsStore } from '../../../database/logisticsStore';
import { useNotification } from '../../../components/ui/NotificationSystem';
import {
    UserPlus, Trash2, RefreshCw, MapPin, ShieldAlert, CreditCard as IdCard
} from 'lucide-react';

const CoordinatorsTab: React.FC = () => {
    const {
        coordinators, dbStations, selectedEventId, selectedEvent,
        handleAddCoordinator, handleDeleteCoordinator,
        setDbStations, setShowHighlights
    } = useTransport();
    const { showToast } = useNotification();

    const [formRoleType, setFormRoleType] = useState<'vehicle' | 'stage'>('vehicle');
    const [form, setForm] = useState({
        firstName: '', lastName: '', username: '', password: '', contact: '', stationId: '', email: ''
    });

    const eventLocked = isEventLocked(selectedEvent?.date || '');
    const eventStations = Array.isArray(dbStations) ? dbStations.filter(s => s.eventId === selectedEventId) : [];

    const handleRefreshStations = async () => {
        try {
            const res = await LogisticsStore.getStations();
            if (res.status === 'success') { setDbStations(res.data); showToast('Stations refreshed', 'success'); }
            else showToast('Failed to refresh stations', 'error');
        } catch {
            showToast('Failed to refresh stations', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleAddCoordinator(e, { ...form, roleType: formRoleType });
        setForm({ firstName: '', lastName: '', username: '', password: '', contact: '', stationId: '', email: '' });
        setFormRoleType('vehicle');
    };

    return (
        <div>
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-8">
                {/* ── Add form or Locked state ── (mobile: first, desktop: second column) */}
                <div className="order-1 lg:order-2">
                {!eventLocked ? (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 lg:p-6 h-fit">
                        <h2 className="text-lg lg:text-xl font-bold text-gray-800 mb-3 lg:mb-4 flex items-center">
                            <UserPlus className="w-5 h-5 mr-2 text-ministry-orange" />
                            Add Coordinator
                        </h2>
                        <p className="text-sm text-gray-500 mb-4 lg:mb-6">
                            Create credentials for coordinators for <strong>{selectedEvent?.title}</strong>.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Role Type */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Role Type</label>
                                <select
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none"
                                    value={formRoleType}
                                    onChange={e => {
                                        const type = e.target.value as 'vehicle' | 'stage';
                                        setFormRoleType(type);
                                        if (type === 'vehicle') {
                                            setForm(f => ({ ...f, stationId: '' }));
                                        } else {
                                            const first = eventStations[0];
                                            setForm(f => ({ ...f, stationId: first?.id || '' }));
                                        }
                                    }}
                                >
                                    <option value="vehicle">Vehicle Coordinator</option>
                                    <option value="stage">Stage Coordinator</option>
                                </select>
                            </div>

                            {/* Station selector — stage coordinators only */}
                            {formRoleType === 'stage' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-gray-700">Assign Pickup Station</label>
                                        <button type="button" onClick={handleRefreshStations} className="text-xs text-ministry-orange hover:underline flex items-center">
                                            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            required
                                            className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none appearance-none"
                                            value={form.stationId}
                                            onChange={e => setForm(f => ({ ...f, stationId: e.target.value }))}
                                        >
                                            <option value="" disabled>Select Station</option>
                                            {eventStations.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {eventStations.length === 0 && (
                                        <p className="text-xs text-red-500 font-bold mt-2">
                                            No stations found for this event. Try refreshing or select a different operation.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">First Name</label>
                                    <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Last Name</label>
                                    <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" />
                                </div>
                            </div>

                            {/* Credentials */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Username</label>
                                    <input required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="username" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Password</label>
                                    <input required type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none font-mono" placeholder="password" />
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Email</label>
                                    <input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-ministry-orange outline-none" placeholder="coordinator@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Contact Number</label>
                                    <PhoneInput value={form.contact} onChange={val => setForm(f => ({ ...f, contact: val }))} placeholder="770 123 456" />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button type="submit" className="w-full bg-ministry-text text-white py-3 rounded-xl font-bold hover:bg-ministry-orange transition-colors shadow-lg">
                                    Create Coordinator
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl shadow-sm p-4 lg:p-6 flex flex-col items-center justify-center text-center h-full">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                            <ShieldAlert className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Event Locked</h3>
                        <p className="text-gray-500 mt-2 max-w-xs">This event has been concluded and locked. Coordinators cannot be added or modified.</p>
                        <button onClick={() => setShowHighlights(true)} className="mt-6 text-ministry-orange font-bold hover:underline">View Highlights</button>
                    </div>
                )}
                </div>

                {/* ── Coordinator list ── (mobile: second, desktop: first column) */}
                <div className="order-2 lg:order-1 bg-ministry-card border border-gray-200 rounded-2xl shadow-sm p-4 lg:p-6">
                    <div className="flex justify-between items-center mb-3 lg:mb-4">
                        <h2 className="text-lg lg:text-xl font-bold text-gray-800 flex items-center">
                            <IdCard className="w-5 h-5 mr-2 text-ministry-orange" />
                            Coordinators
                        </h2>
                        <span className="text-xs bg-ministry-neon text-black px-2 py-1 rounded font-bold">
                            {selectedEvent?.title}
                        </span>
                    </div>

                    {coordinators.length === 0 ? (
                        <div className="text-center py-8 lg:py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm">
                            No coordinators found for this operation. Add one to get started.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {coordinators.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-3 lg:p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 shrink-0 text-sm">
                                            {c.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-gray-900 text-sm truncate">{c.name}</p>
                                            <p className="text-xs text-gray-400 truncate">@{c.username}</p>
                                            <div className="mt-0.5 flex flex-wrap gap-1">
                                                {c.role === 'Stage Coordinator' || c.stationId ? (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                                                        Stage: {dbStations.find(s => s.id === c.stationId)?.name || 'Unknown Station'}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-ministry-orange border border-orange-200">
                                                        Vehicle Coordinator
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteCoordinator(c.id)}
                                        disabled={eventLocked}
                                        className={`p-2 rounded-lg transition-colors shrink-0 ${eventLocked ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                        title="Delete Coordinator"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoordinatorsTab;
