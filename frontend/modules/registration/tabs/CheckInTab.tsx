/**
 * CheckInTab
 *
 * Extracted UI for the Check-In tab of RegistrationDashboard.
 *
 * ─────────────────────────────────────────────────────────────────
 * HYBRID MODE — Monolith Adapter Layer Pattern
 *
 * ALL STATE lives in RegistrationDashboard.tsx (unchanged).
 * This component receives a single `CheckInTabProps` bundle from
 * the monolith and renders the check-in UI only.
 *
 * No state is duplicated. No logic is reimplemented.
 * The monolith replaces 4 separate JSX blocks with:
 *   <CheckInTab {...checkInProps} />
 * ─────────────────────────────────────────────────────────────────
 *
 * Sections rendered (in order):
 *   1. Services list grid         (viewMode === 'list')
 *   2. Active service view        (viewMode === 'service-active')
 *   3. Register new member form   (viewMode === 'register-new')
 *   4. Bulk member import form    (viewMode === 'bulk-import-members')
 */

import React from 'react';
import {
    Calendar, CalendarPlus, ArrowLeft, Users, UserPlus, Search, CheckCircle,
    Trash2, Download, Baby, Heart, Lock, Copy, Save, Ticket, CreditCard,
    Upload
} from 'lucide-react';
import PhoneInput from '../../../components/PhoneInput';
import { useRegistration } from '../RegistrationContext';
import AddMemberForm from '../components/AddMemberForm';
import BulkImportForm from '../components/BulkImportForm';

export default function CheckInTab() {
    const {
        currentUser,
        canCreateService,
        services,
        selectedService,
        viewMode,
        checkInStats,
        checkedInIds,
        filterCategory,
        setFilterCategory,
        searchQuery,
        setSearchQuery,
        filteredMembers,
        formData,
        handleInputChange,
        handleRegister,
        setFormData,
        bulkMemberText,
        setBulkMemberText,
        handleBulkMemberImport,
        handleFileUpload,
        isImporting,
        importProgress,
        handleOpenService,
        handleBackRegistration,
        handleCheckInMember,
        handleUndoCheckInMember,
        handleDeleteEvent,
        handleDownloadHighlights,
        handleCopyReport,
        handleUpdateManualCount,
        setIsAddEventOpen,
        setEventFormType,
        setIsChildCountModalOpen,
        setViewMode,
        setSearchParams,
        isServiceClosed,
    } = useRegistration();

    const elevatedRoles = ['Administrator', 'Head of Dept', 'Department Head', 'Dept Admin', 'Reg. Admin', 'Registration Admin', 'Registration Head'];

    return (
        <>
            {/* ── 1. SERVICES LIST ───────────────────────────────────────── */}
            {viewMode === 'list' && (
                <div className="space-y-6 p-4 md:p-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">Active Services</h3>
                        {canCreateService && (
                            <button
                                onClick={() => { setEventFormType('Service'); setIsAddEventOpen(true); }}
                                className="flex items-center space-x-2 bg-ministry-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors shadow-sm font-bold text-sm"
                            >
                                <CalendarPlus className="w-4 h-4" />
                                <span className="hidden md:inline">Add Service</span>
                                <span className="md:hidden">Add</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.filter(s => elevatedRoles.includes(currentUser.role) || !isServiceClosed(s.date)).map(service => {
                            const isClosed = isServiceClosed(service.date);
                            return (
                                <div key={service.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-ministry-orange/40 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <Calendar className="w-5 h-5 text-gray-400" />
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                                            {isClosed ? 'Past' : 'Active'}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-bold text-ministry-text">{service.title}</h4>
                                    <p className="text-sm text-gray-500 mb-4">{service.date} • {service.time}</p>
                                    <button
                                        onClick={() => handleOpenService(service)}
                                        className={`w-full py-2 rounded-lg font-bold transition-colors ${isClosed ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-ministry-text text-white hover:bg-ministry-orange'}`}
                                    >
                                        {isClosed ? 'View Highlights' : 'Open Check-In'}
                                    </button>
                                    {currentUser.role === 'TeamLeader' && (
                                        <button
                                            onClick={() => handleDeleteEvent(service)}
                                            className="mt-2 w-full py-2 rounded-lg font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center border border-red-100"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete Service
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        {services.filter(s => elevatedRoles.includes(currentUser.role) || !isServiceClosed(s.date)).length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                No active service
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── 2. ACTIVE SERVICE VIEW ─────────────────────────────────── */}
            {viewMode === 'service-active' && selectedService && (
                <div className="space-y-6 p-4 md:p-0">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <div className="flex items-center space-x-3">
                            <button onClick={handleBackRegistration} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-ministry-text">{selectedService.title}</h2>
                                    {isServiceClosed(selectedService.date) && (
                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full border border-gray-200 font-bold">LOCKED</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">
                                    {isServiceClosed(selectedService.date) ? 'Service Highlights' : 'Live Check-In'} • {selectedService.date}
                                </p>
                            </div>
                        </div>

                        {!isServiceClosed(selectedService.date) && (
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setIsChildCountModalOpen(true)}
                                    className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 border border-gray-200 shadow-sm"
                                >
                                    <Baby className="w-4 h-4" />
                                    <span className="hidden md:inline">Children Count</span>
                                </button>
                                {elevatedRoles.includes(currentUser.role) && (
                                    <button
                                        onClick={handleCopyReport}
                                        className="flex items-center justify-center p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-200 shadow-sm transition-colors"
                                        title="Copy WhatsApp Report"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => { setViewMode('register-new'); setSearchParams((prev: URLSearchParams) => { prev.set('view', 'register'); return prev; }, { replace: true }); }}
                                    className="flex items-center space-x-2 bg-ministry-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 shadow-md"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span className="hidden md:inline">Register New</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats / Check-in area */}
                    {isServiceClosed(selectedService.date) ? (
                        /* Highlights view */
                        <div className="space-y-8 animate-in fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Total Members', value: checkInStats.total, icon: Users, color: 'blue' },
                                    { label: 'First Timers', value: checkInStats.firstTimers, icon: UserPlus, color: 'orange' },
                                    { label: 'Children Count', value: (selectedService as any).stats?.manualChildrenCount || 0, icon: Baby, color: 'purple' },
                                    { label: 'Souls Won', value: checkInStats.soulsWon, icon: Heart, color: 'red' },
                                ].map(({ label, value, icon: Icon, color }) => (
                                    <div key={label} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                                        <div className={`p-3 bg-${color}-50 text-${color}-600 rounded-full mb-3`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                                        <p className="text-4xl font-black text-gray-900 mt-2">{value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-center">
                                <button
                                    onClick={handleDownloadHighlights}
                                    className="flex items-center space-x-3 bg-gray-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                                >
                                    <Download className="w-5 h-5" />
                                    <span>Download Highlights Report</span>
                                </button>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 max-w-2xl mx-auto">
                                <p className="flex items-center justify-center gap-2 font-medium">
                                    <Lock className="w-4 h-4" /> Service is Closed
                                </p>
                                <p className="text-sm mt-1">Detailed check-in lists and editing are disabled for past services.</p>
                            </div>
                        </div>
                    ) : (
                        /* Active check-in view */
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    onClick={() => setFilterCategory(filterCategory === 'CHECKED_IN_ALL' ? null : 'CHECKED_IN_ALL')}
                                    className={`cursor-pointer p-4 rounded-xl shadow-lg border-l-4 border-ministry-neon transition-all ${filterCategory === 'CHECKED_IN_ALL' ? 'bg-ministry-neon/10 ring-2 ring-ministry-neon transform scale-[1.02]' : (!filterCategory ? 'bg-ministry-text text-white transform scale-[1.02]' : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50')}`}
                                >
                                    <p className={`text-xs uppercase font-bold ${filterCategory === 'CHECKED_IN_ALL' ? 'text-ministry-text' : (!filterCategory ? 'text-gray-400' : 'text-gray-500')}`}>Total Check-ins</p>
                                    <p className={`text-3xl font-black mt-1 ${filterCategory === 'CHECKED_IN_ALL' ? 'text-ministry-text' : ''}`}>{checkInStats.total}</p>
                                </div>
                                <div
                                    onClick={() => setFilterCategory(filterCategory === 'First Timer' ? null : 'First Timer')}
                                    className={`cursor-pointer p-4 rounded-xl shadow-sm border border-gray-200 border-l-4 border-ministry-orange transition-all ${filterCategory === 'First Timer' ? 'bg-orange-50 ring-2 ring-ministry-orange transform scale-[1.02]' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    <p className={`text-xs uppercase font-bold ${filterCategory === 'First Timer' ? 'text-ministry-orange' : 'text-gray-500'}`}>First Timers</p>
                                    <p className="text-3xl font-black text-gray-900 mt-1">{checkInStats.firstTimers}</p>
                                </div>
                            </div>

                            <div className="max-w-xl mx-auto space-y-4">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ministry-orange" />
                                    <input
                                        className="w-full pl-10 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg focus:outline-none focus:border-ministry-orange focus:ring-1 focus:ring-ministry-orange transition-all"
                                        placeholder="Search member by name or phone..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                {(searchQuery || filterCategory) && (
                                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                        {filteredMembers.map(m => (
                                            <div key={m.id} className="p-4 flex flex-row justify-between items-center gap-4 hover:bg-gray-50">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 truncate">{m.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{m.phone} • {m.residency || 'No Residence'}</p>
                                                </div>
                                                <div>
                                                    {checkedInIds.has(m.id) ? (
                                                        elevatedRoles.includes(currentUser.role) ? (
                                                            <button
                                                                onClick={() => handleUndoCheckInMember(m.id)}
                                                                className="text-green-600 font-bold text-sm flex items-center hover:text-red-500 transition-colors group"
                                                                title="Click to Undo Check-In"
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-1 group-hover:hidden" />
                                                                <span className="group-hover:hidden">Checked In</span>
                                                                <span className="hidden group-hover:inline text-red-500">Undo Check-In</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-green-600 font-bold text-sm flex items-center">
                                                                <CheckCircle className="w-4 h-4 mr-1" /> Checked In
                                                            </span>
                                                        )
                                                    ) : (
                                                        <button
                                                            onClick={() => handleCheckInMember(m.id)}
                                                            className="bg-ministry-text text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-ministry-orange transition-colors"
                                                        >
                                                            Check In
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {filteredMembers.length === 0 && (
                                            <div className="p-4 text-center text-gray-500">No members found.</div>
                                        )}
                                    </div>
                                )}

                                {searchQuery && filteredMembers.length === 0 && (
                                    <div className="text-center pt-4">
                                        <p className="text-gray-500 mb-2">Member not found?</p>
                                        <button
                                            onClick={() => { setViewMode('register-new'); setSearchParams((prev: URLSearchParams) => { prev.set('view', 'register'); return prev; }, { replace: true }); }}
                                            className="text-ministry-orange font-bold hover:underline"
                                        >
                                            Register New Member
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── 3. REGISTER NEW MEMBER FORM ────────────────────────────── */}
            <AddMemberForm />

            {/* ── 4. BULK IMPORT FORM ────────────────────────────────────── */}
            <BulkImportForm />
        </>
    );
};
