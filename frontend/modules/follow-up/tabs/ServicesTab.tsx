/**
 * ServicesTab
 *
 * Services list → service detail soul capture view.
 * Consumes shared state via useFollowUp() — no props.
 */

import React from 'react';
import { useFollowUp } from '../FollowUpContext';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { isServiceClosed } from '../../../utils';
import { SoulsStore } from '../../../database/soulsStore';
import { Calendar, Search, Plus, Pencil, Trash2, Check } from 'lucide-react';

const ServicesTab: React.FC = () => {
    const {
        services, souls, selectedEventId, setSelectedEventId,
        searchQuery, setSearchQuery, memberSearchResults, isSearchingMembers,
        setShowAddSoulForm, setEditingSoul, handleAddSoul,
    } = useFollowUp();
    const { showToast, confirm: showConfirm } = useNotification();

    // ── Services grid ─────────────────────────────────────────────────────────
    if (!selectedEventId) {
        return (
            <div className="p-6 space-y-6 animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-gray-800">Recent Services</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map(service => (
                        <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden">
                            <div className="p-5 border-b border-gray-50 flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-bold text-ministry-orange uppercase tracking-wider">Service</span>
                                    <h3 className="text-lg font-bold text-gray-900 mt-1">{service.title}</h3>
                                    <div className="flex items-center text-gray-500 text-sm mt-2">
                                        <Calendar className="w-3.5 h-3.5 mr-1" /> {service.date}
                                        {isServiceClosed(service.date) && (
                                            <span className="ml-2 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold border border-gray-200">LOCKED</span>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                                    {souls.filter(s => s.sourceId === service.id).length} Souls
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50/50">
                                <button
                                    onClick={() => setSelectedEventId(service.id)}
                                    className="w-full bg-ministry-text text-white py-2 rounded-lg text-sm font-bold hover:bg-ministry-orange transition-colors flex items-center justify-center shadow-sm"
                                >
                                    Open Service
                                </button>
                            </div>
                        </div>
                    ))}
                    {services.length === 0 && (
                        <div className="text-gray-400 col-span-full text-center py-10">No services found.</div>
                    )}
                </div>
            </div>
        );
    }

    // ── Service detail ────────────────────────────────────────────────────────
    const currentService = services.find(s => s.id === selectedEventId);
    const isLocked = currentService ? isServiceClosed(currentService.date) : false;
    const serviceSouls = souls.filter(s => s.sourceId === selectedEventId);
    const filteredSouls = serviceSouls.filter(s =>
        s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.phone && s.phone.includes(searchQuery))
    );

    const handleDeleteSoul = async (soul: any) => {
        const confirmed = await showConfirm(
            <span>Delete <strong>{soul.firstName} {soul.lastName}</strong>? This cannot be undone.</span>,
            { title: 'Delete Soul', confirmText: 'Delete', isDestructive: true }
        );
        if (confirmed) {
            try { await SoulsStore.delete(soul.id || ''); showToast('Soul deleted successfully', 'success'); }
            catch { showToast('Failed to delete soul', 'error'); }
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center space-x-4">
                    <button onClick={() => setSelectedEventId(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">←</button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{currentService?.title}</h2>
                        <p className="text-gray-500 text-sm flex items-center mt-1">
                            <Calendar className="w-4 h-4 mr-1" /> {currentService?.date}
                            {isLocked && <span className="ml-2 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full border border-gray-200 font-bold">LOCKED</span>}
                        </p>
                    </div>
                </div>
                {!isLocked && (
                    <button onClick={() => setShowAddSoulForm(true)} className="flex items-center space-x-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-colors shadow-md font-bold">
                        <Plus className="w-5 h-5" /><span>Add Entry</span>
                    </button>
                )}
            </div>

            {/* Search with member dropdown */}
            <div className="relative z-50">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange shadow-sm"
                    placeholder="Search member by name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery.length > 2 && (memberSearchResults.length > 0 || isSearchingMembers) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in">
                        {isSearchingMembers ? (
                            <div className="p-4 text-center text-gray-400 text-sm">Searching global database...</div>
                        ) : (
                            <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                                {memberSearchResults.map(member => {
                                    const isAlreadyAdded = souls.some(s =>
                                        s.sourceId === selectedEventId &&
                                        ((s.phone && member.phone && s.phone === member.phone) || (s.firstName + ' ' + s.lastName === member.name))
                                    );
                                    return (
                                        <div key={member.id} className="p-3 hover:bg-gray-50 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-gray-800">{member.name}</p>
                                                <p className="text-xs text-gray-500">{member.phone} • {member.residency}</p>
                                            </div>
                                            {isAlreadyAdded ? (
                                                <span className="text-xs font-bold text-gray-400 flex items-center bg-gray-100 px-2 py-1 rounded"><Check className="w-3 h-3 mr-1" /> Added</span>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        handleAddSoul({ firstName: member.name.split(' ')[0], lastName: member.name.split(' ').slice(1).join(' '), phone: member.phone, gender: member.gender, residence: member.residency, email: '', status: 'New', notes: 'From Member Database', sourceType: 'Service', sourceId: selectedEventId, eventId: selectedEventId || undefined, capturedBy: '' });
                                                        setSearchQuery('');
                                                    }}
                                                    className="text-xs bg-ministry-orange text-white px-3 py-1.5 rounded-lg font-bold hover:bg-orange-600 flex items-center"
                                                >
                                                    <Plus className="w-3 h-3 mr-1" /> Add Soul
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="bg-ministry-text text-white p-5 rounded-xl shadow-sm">
                <p className="text-xs uppercase font-bold text-gray-400 mb-1">Total Souls Won</p>
                <p className="text-3xl font-black">{serviceSouls.length}</p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex justify-between items-center">
                    <span>Souls Captured in this Service</span>
                    <span className="text-xs font-normal text-gray-500 bg-white px-2 py-1 rounded border">{serviceSouls.length} Records</span>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-gray-500 font-bold border-b border-gray-100 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Name</th><th className="px-6 py-3">Phone</th>
                            <th className="px-6 py-3">Residence</th><th className="px-6 py-3">Gender</th>
                            <th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredSouls.map(soul => (
                            <tr key={soul.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-bold text-gray-900">{soul.firstName} {soul.lastName}</td>
                                <td className="px-6 py-3 text-gray-600 font-mono">{soul.phone}</td>
                                <td className="px-6 py-3 text-gray-600">{soul.residence}</td>
                                <td className="px-6 py-3 text-gray-600">{soul.gender}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${soul.status === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{soul.status}</span>
                                </td>
                                <td className="px-6 py-3 text-right flex justify-end gap-2">
                                    <button onClick={() => { setEditingSoul(soul); setShowAddSoulForm(true); }} disabled={isLocked} className={`p-1 ${isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600'}`}><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteSoul(soul)} disabled={isLocked} className={`p-1 ${isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {serviceSouls.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No souls recorded for this service yet. Click "Add Entry" to begin.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ServicesTab;
