import React, { useState, useEffect } from 'react';
import { useResidentStore } from '../database/residentStore';
import { User, MinistryEvent, Residence, ResidenceOutreachReport } from '../types';
import { MapPin, Users, Calendar, Activity, Loader2, Plus, Home, ClipboardList, TrendingUp, Search, Check, ChevronRight, ChevronLeft, Eye, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { MemberStore } from '../database/memberStore';
import { Member } from '../types';

interface ResidentDashboardProps {
    currentUser: User | null;
    events: MinistryEvent[];
    onOpenModal: (type: any) => void;
}

const ResidentDashboard: React.FC<ResidentDashboardProps> = ({ currentUser, events, onOpenModal }) => {
    const {
        residences,
        reports,
        loading,
        error,
        fetchResidences,
        fetchReports,
        addResidence,
        deleteResidence,
        fetchResidenceMembers,
        addReport
    } = useResidentStore();

    const [activeTab, setActiveTab] = useState<'overview' | 'residences' | 'reports'>('overview');
    const [showAddResidence, setShowAddResidence] = useState(false);
    const [showAddReport, setShowAddReport] = useState(false);

    // 2-step Add Residence flow states
    const [addStep, setAddStep] = useState<1 | 2>(1);
    const [exactMatches, setExactMatches] = useState<Member[]>([]);
    const [similarMatches, setSimilarMatches] = useState<Member[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

    // Manual search states inside Step 2
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
    const [isSearchingMembers, setIsSearchingMembers] = useState(false);
    const [isCreatingResidence, setIsCreatingResidence] = useState(false);
    const [isScanningMatches, setIsScanningMatches] = useState(false);

    // Form states
    const [newResidence, setNewResidence] = useState<Partial<Residence>>({
        name: '',
        coordinator_name: '',
        coordinator_email: '',
        coordinator_contact: ''
    });

    const [newReport, setNewReport] = useState<Partial<ResidenceOutreachReport>>({
        residence_id: '',
        date: new Date().toISOString().split('T')[0],
        souls_won: 0,
        notes: '',
        event_id: ''
    });

    const [selectedResidenceForDetails, setSelectedResidenceForDetails] = useState<Residence | null>(null);
    const [residenceMembers, setResidenceMembers] = useState<Member[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    useEffect(() => {
        fetchResidences();
        fetchReports();
    }, [fetchResidences, fetchReports]);

    const handleViewResidence = async (residence: Residence) => {
        if (selectedResidenceForDetails?.id === residence.id) {
            setSelectedResidenceForDetails(null);
            return;
        }

        setSelectedResidenceForDetails(residence);
        setIsLoadingDetails(true);
        try {
            const members = await fetchResidenceMembers(residence.id as string);
            setResidenceMembers(members);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleDeleteResidence = async (residence: Residence) => {
        if (window.confirm(`Are you sure you want to delete ${residence.name}? This action cannot be undone.`)) {
            const success = await deleteResidence(residence.id as string);
            if (success) {
                // If we were viewing the details of the deleted residence, close the details panel
                if (selectedResidenceForDetails?.id === residence.id) {
                    setSelectedResidenceForDetails(null);
                    setResidenceMembers([]);
                }

                // Optional: You could also invalidate MemberStore cache here if needed,
                // but closing the view is enough to stop showing them right now.
            }
        }
    };

    const handleNextStep = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newResidence.name) return;
        setAddStep(2);

        // Auto-scan database for members referencing similar residence names
        setIsScanningMatches(true);
        try {
            const matches = await MemberStore.searchMembersByResidency(newResidence.name);

            // Separate into exact vs similar based on name match AND attendance
            const targetName = newResidence.name?.toLowerCase().trim() || '';

            // Exact matches are based strictly on name
            const exact = matches.filter(m => {
                return m.residency?.toLowerCase().trim() === targetName;
            });

            // Auto-select exact matches ONLY if they have attendance > 0
            const autoSelectIds = new Set(
                exact.filter(m => m.attendedServiceIds && m.attendedServiceIds.length > 0)
                    .map(m => m.id as string)
            );

            const exactIds = new Set(exact.map(m => m.id as string));

            // Similar matches are the rest
            const similar = matches.filter(m => !exactIds.has(m.id as string));

            setExactMatches(exact);
            setSimilarMatches(similar);

            // Set initial selections
            setSelectedMemberIds(autoSelectIds);
        } catch (err) {
            console.error('Failed to search members by residency:', err);
        } finally {
            setIsScanningMatches(false);
        }
    };

    const handleSearchMembers = async () => {
        if (!memberSearchQuery.trim()) return;
        setIsSearchingMembers(true);
        try {
            const res = await MemberStore.getMembers(1, 10, memberSearchQuery);
            if (res.status === 'success') {
                // Filter out members who already belong to exact Matches or similar Matches
                const allMatchedIds = new Set([...exactMatches, ...similarMatches].map(m => m.id as string));
                setMemberSearchResults(res.data.filter(m => !allMatchedIds.has(m.id as string)));
            }
        } catch (err) {
            console.error('Failed to search members manually:', err);
        } finally {
            setIsSearchingMembers(false);
        }
    };

    const toggleMemberSelection = (id: string) => {
        const next = new Set(selectedMemberIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedMemberIds(next);
    };

    const handleCreateResidence = async () => {
        if (!newResidence.name) return;
        setIsCreatingResidence(true);
        try {
            // 1. Create Residence
            const success = await addResidence(newResidence as Omit<Residence, 'id' | 'manifest_id' | 'created_at' | 'updated_at'>);
            if (!success) {
                throw new Error("Failed to create residence");
            }

            // 2. Bulk Update Members
            const memberIds = Array.from(selectedMemberIds) as string[];
            if (memberIds.length > 0) {
                await MemberStore.bulkUpdateResidency(memberIds, newResidence.name);
            }

            // Reset state
            setShowAddResidence(false);
            setAddStep(1);
            setNewResidence({ name: '', coordinator_name: '', coordinator_email: '', coordinator_contact: '' });
            setSelectedMemberIds(new Set());
            setExactMatches([]);
            setSimilarMatches([]);
            setMemberSearchQuery('');
            setMemberSearchResults([]);
        } catch (err) {
            console.error("Failed to add residence or update members:", err);
            // Ideally show a toast notification here
        } finally {
            setIsCreatingResidence(false);
        }
    };

    const handleAddReport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addReport(newReport as Omit<ResidenceOutreachReport, 'id' | 'manifest_id' | 'created_at' | 'updated_at'>);
            setShowAddReport(false);
            setNewReport({ residence_id: '', date: new Date().toISOString().split('T')[0], souls_won: 0, notes: '', event_id: '' });
        } catch (err) {
            console.error("Failed to add report:", err);
            // Ideally show a toast notification here
        }
    };

    if (loading && residences.length === 0) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-ministry-primary" />
            </div>
        );
    }

    // Calculate some overview stats
    const totalSoulsWon = reports.reduce((sum, r) => sum + (r.soulsWon || 0), 0);
    const totalResidences = residences.length;
    const recentReports = reports.slice(0, 5); // Just grab the latest 5

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-ministry-text flex items-center gap-3">
                        <Home className="w-8 h-8 text-ministry-orange" />
                        Residents Dashboard
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 mt-1">
                        Manage resident areas, outreach, and souls won.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Navigation Tabs (Pills style) */}
            <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-xl w-fit overflow-x-auto mb-8">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <TrendingUp className={`w-4 h-4 ${activeTab === 'overview' ? 'text-ministry-neon' : ''}`} />
                    <span>Overview</span>
                </button>
                <button
                    onClick={() => setActiveTab('residences')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'residences' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <MapPin className={`w-4 h-4 ${activeTab === 'residences' ? 'text-ministry-neon' : ''}`} />
                    <span>Residences</span>
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <ClipboardList className={`w-4 h-4 ${activeTab === 'reports' ? 'text-ministry-neon' : ''}`} />
                    <span>Outreach Reports</span>
                </button>
            </div>

            {/* Tab Content: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="bg-blue-100 p-3 rounded-lg mr-4">
                                <MapPin className="text-blue-600 w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">Target Residences</p>
                                <h3 className="text-2xl font-bold">{totalResidences}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="bg-green-100 p-3 rounded-lg mr-4">
                                <Users className="text-green-600 w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">Total Souls Won</p>
                                <h3 className="text-2xl font-bold">{totalSoulsWon}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="bg-purple-100 p-3 rounded-lg mr-4">
                                <Activity className="text-purple-600 w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm">Total Outreach Reports</p>
                                <h3 className="text-2xl font-bold">{reports.length}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-xl font-semibold mb-4 text-ministry-text">Recent Outreach</h2>
                        {recentReports.length > 0 ? (
                            <div className="space-y-4">
                                {recentReports.map(report => (
                                    <div key={report.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <div>
                                            <h4 className="font-medium text-gray-900">
                                                {residences.find(r => r.id === report.residenceId)?.name || 'Unknown Residence'}
                                            </h4>
                                            <p className="text-sm text-gray-500">{new Date(report.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {report.soulsWon} souls won
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">No recent outreach reports found.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Tab Content: Residences */}
            {activeTab === 'residences' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-ministry-text">Target Residences</h2>
                        <button
                            onClick={() => setShowAddResidence(!showAddResidence)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Residence
                        </button>
                    </div>

                    {/* Add Residence Modal */}
                    {showAddResidence && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-white w-full max-w-2xl p-8 rounded-2xl shadow-2xl h-[90vh] flex flex-col overflow-y-auto relative">
                                <button
                                    onClick={() => {
                                        setShowAddResidence(false);
                                        setAddStep(1);
                                        setNewResidence({ name: '', coordinator_name: '', coordinator_email: '', coordinator_contact: '' });
                                    }}
                                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>

                                <h3 className="text-xl font-bold mb-8 flex items-center">
                                    <Home className="w-5 h-5 mr-2 text-ministry-orange" />
                                    Add New Residence
                                </h3>

                                {/* Step Indicator */}
                                <div className="flex justify-center mb-10 relative">
                                    <div className="flex items-center w-full max-w-sm relative mt-2">
                                        {/* Step 1 */}
                                        <div className="flex flex-col items-center relative z-10 w-10">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${addStep >= 1 ? 'bg-ministry-orange text-white' : 'bg-gray-200 text-gray-400'}`}>1</div>
                                            <span className={`absolute top-10 text-xs font-bold whitespace-nowrap mt-1 ${addStep === 1 ? 'text-ministry-orange' : 'text-gray-400'}`}>Basic Details</span>
                                        </div>

                                        {/* Connecting Line */}
                                        <div className="flex-1 h-1 mx-2 bg-gray-200 rounded relative">
                                            <div className={`absolute top-0 left-0 h-full bg-ministry-orange rounded transition-all duration-300 ${addStep >= 2 ? 'w-full' : 'w-0'}`}></div>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="flex flex-col items-center relative z-10 w-10">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${addStep >= 2 ? 'bg-ministry-orange text-white' : 'bg-gray-200 text-gray-400'}`}>2</div>
                                            <span className={`absolute top-10 text-xs font-bold whitespace-nowrap mt-1 ${addStep >= 2 ? 'text-ministry-orange' : 'text-gray-400'}`}>Assign Members</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex-1">
                                    {addStep === 1 ? (
                                        <form id="add-residence-form-step1" onSubmit={handleNextStep} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Residence Name</label>
                                                    <input
                                                        required
                                                        type="text"
                                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-ministry-orange outline-none transition-all"
                                                        value={newResidence.name || ''}
                                                        onChange={(e) => setNewResidence({ ...newResidence, name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Coordinator Name</label>
                                                    <input
                                                        required
                                                        type="text"
                                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-ministry-orange outline-none transition-all"
                                                        value={newResidence.coordinator_name || ''}
                                                        onChange={(e) => setNewResidence({ ...newResidence, coordinator_name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Coordinator Contact</label>
                                                    <input
                                                        type="text"
                                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-ministry-orange outline-none transition-all"
                                                        value={newResidence.coordinator_contact || ''}
                                                        onChange={(e) => setNewResidence({ ...newResidence, coordinator_contact: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Coordinator Email</label>
                                                    <input
                                                        required
                                                        type="email"
                                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-ministry-orange outline-none transition-all"
                                                        value={newResidence.coordinator_email || ''}
                                                        onChange={(e) => setNewResidence({ ...newResidence, coordinator_email: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="bg-green-50 text-green-800 p-4 rounded-lg border border-green-100 flex items-start justify-between">
                                                <div className="flex items-start">
                                                    <Check className="w-5 h-5 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                                                    <div className="text-sm">
                                                        <p>Select members with similar residency names to assign them to <strong>{newResidence.name}</strong>.</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-green-200 text-sm font-bold text-green-700 whitespace-nowrap">
                                                    Total Marked: {selectedMemberIds.size}
                                                </div>
                                            </div>

                                            {isScanningMatches ? (
                                                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-100">
                                                    <Loader2 className="w-8 h-8 text-ministry-orange animate-spin mb-3" />
                                                    <p className="text-gray-600 font-medium text-sm">Scanning entire database for members...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Exact Matches */}
                                                    {exactMatches.length > 0 && (
                                                        <div>
                                                            <div className="mb-2">
                                                                <h4 className="font-medium text-gray-900">Exact Match: "{newResidence.name}"</h4>
                                                                <p className="text-xs text-gray-500">Members with past attendance are pre-selected.</p>
                                                            </div>
                                                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                                                                {exactMatches.map(m => (
                                                                    <div key={m.id} className="flex items-center justify-between p-3 bg-white">
                                                                        <div className="flex items-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedMemberIds.has(m.id as string)}
                                                                                onChange={() => toggleMemberSelection(m.id as string)}
                                                                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                                                            />
                                                                            <div className="ml-3 flex-grow">
                                                                                <div className="flex items-center">
                                                                                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                                                                                    {(() => {
                                                                                        const attendedCount = m.attendedServiceIds?.length || 0;
                                                                                        const percentage = events.length > 0 ? Math.round((attendedCount / events.length) * 100) : 0;
                                                                                        return (
                                                                                            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${percentage > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                                                {percentage}%
                                                                                            </span>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                                <p className="text-xs text-gray-500">{m.phone} • Residency: {m.residency}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Auto-detected Similar Matches */}
                                                    {similarMatches.length > 0 && (
                                                        <div>
                                                            <h4 className="font-medium text-gray-900 mb-2">Similar Matches</h4>
                                                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                                                                {similarMatches.map(m => (
                                                                    <div key={m.id} className="flex items-center justify-between p-3 bg-white">
                                                                        <div className="flex items-center">
                                                                            <div className="ml-3 flex-grow">
                                                                                <div className="flex items-center">
                                                                                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                                                                                    {(() => {
                                                                                        const attendedCount = m.attendedServiceIds?.length || 0;
                                                                                        const percentage = events.length > 0 ? Math.round((attendedCount / events.length) * 100) : 0;
                                                                                        return (
                                                                                            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${percentage > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                                                {percentage}%
                                                                                            </span>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                                <p className="text-xs text-gray-500">{m.phone} • Residency: {m.residency}</p>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleMemberSelection(m.id as string)}
                                                                                className={`ml-4 ${selectedMemberIds.has(m.id as string)
                                                                                    ? 'px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors'
                                                                                    : 'px-3 py-1 bg-ministry-text text-white text-xs font-bold rounded-lg hover:bg-ministry-orange transition-colors'
                                                                                    }`}
                                                                            >
                                                                                {selectedMemberIds.has(m.id as string) ? 'Added' : 'Add'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {similarMatches.length === 0 && (
                                                        <div className="p-4 text-center text-gray-500 text-sm">
                                                            No similar matches found.
                                                        </div>
                                                    )}

                                                    {/* Manual Search Section */}
                                                    <div>
                                                        <h4 className="font-bold text-gray-700 mb-2">Search Additional Members</h4>
                                                        <div className="flex space-x-2 mb-4">
                                                            <div className="relative flex-1">
                                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                    <Search className="h-4 w-4 text-gray-400" />
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-ministry-orange outline-none transition-all"
                                                                    placeholder="Search member by name..."
                                                                    value={memberSearchQuery}
                                                                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchMembers()}
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={handleSearchMembers}
                                                                disabled={isSearchingMembers || !memberSearchQuery.trim()}
                                                                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                                            >
                                                                {isSearchingMembers ? 'Searching...' : 'Search'}
                                                            </button>
                                                        </div>

                                                        {memberSearchResults.length > 0 && (
                                                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                                                                {memberSearchResults.map(m => (
                                                                    <div key={m.id} className="flex items-center justify-between p-3 bg-white">
                                                                        <div className="ml-3 flex-grow">
                                                                            <div className="flex items-center">
                                                                                <p className="text-sm font-medium text-gray-900">{m.name}</p>
                                                                                {(() => {
                                                                                    const attendedCount = m.attendedServiceIds?.length || 0;
                                                                                    const percentage = events.length > 0 ? Math.round((attendedCount / events.length) * 100) : 0;
                                                                                    return (
                                                                                        <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${percentage > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                                            {percentage}%
                                                                                        </span>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                            <p className="text-xs text-gray-500">{m.phone} • Residency: {m.residency || 'N/A'}</p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleMemberSelection(m.id as string)}
                                                                            className={`ml-4 ${selectedMemberIds.has(m.id as string)
                                                                                ? 'px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors'
                                                                                : 'px-3 py-1 bg-ministry-text text-white text-xs font-bold rounded-lg hover:bg-ministry-orange transition-colors'
                                                                                }`}
                                                                        >
                                                                            {selectedMemberIds.has(m.id as string) ? 'Added' : 'Add'}
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {memberSearchResults.length === 0 && memberSearchQuery && !isSearchingMembers && (
                                                            <p className="text-sm text-gray-500 mt-2">No additional members found. Try refining your search.</p>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                                    {addStep === 1 ? (
                                        <>
                                            <button
                                                form="add-residence-form-step1"
                                                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
                                                type="button"
                                                onClick={() => {
                                                    setShowAddResidence(false);
                                                    setNewResidence({ name: '', coordinator_name: '', coordinator_email: '', coordinator_contact: '' });
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                form="add-residence-form-step1"
                                                type="submit"
                                                className="px-6 py-2 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange transition-colors shadow-md flex items-center"
                                            >
                                                Next Step
                                                <ChevronRight className="w-4 h-4 ml-1" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg flex items-center"
                                                onClick={() => setAddStep(1)}
                                            >
                                                <ChevronLeft className="w-4 h-4 mr-1" />
                                                Back
                                            </button>
                                            <button
                                                onClick={handleCreateResidence}
                                                disabled={isCreatingResidence || isScanningMatches}
                                                className={`px-6 py-2 bg-ministry-text text-white font-bold rounded-xl hover:bg-ministry-orange transition-colors shadow-md flex items-center ${(isCreatingResidence || isScanningMatches) ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            >
                                                {isCreatingResidence ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                ) : null}
                                                Create Residential Area
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                    }

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {residences.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordinator</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {residences.map((residence) => (
                                            <React.Fragment key={residence.id}>
                                                <tr className={`hover:bg-gray-50 transition-colors ${selectedResidenceForDetails?.id === residence.id ? 'bg-orange-50/30' : ''}`}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{residence.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{residence.coordinatorName}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{residence.coordinatorContact || '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{residence.coordinatorEmail || '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleViewResidence(residence)}
                                                            className="text-blue-600 hover:text-blue-900 mr-4 font-semibold p-1 rounded hover:bg-blue-50 transition-colors"
                                                            title={selectedResidenceForDetails?.id === residence.id ? "Close Details" : "View Details"}
                                                        >
                                                            {selectedResidenceForDetails?.id === residence.id ?
                                                                <ChevronUp className="w-5 h-5 inline-block" /> :
                                                                <ChevronDown className="w-5 h-5 inline-block" />
                                                            }
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteResidence(residence)}
                                                            className="text-red-600 hover:text-red-900 font-semibold p-1 rounded hover:bg-red-50 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-5 h-5 inline-block" />
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expandable Details Row */}
                                                {selectedResidenceForDetails?.id === residence.id && (
                                                    <tr>
                                                        <td colSpan={5} className="bg-gray-50/80 border-t border-gray-100 p-0">
                                                            <div className="p-6">
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                                                                        <div className="flex items-center space-x-2 mb-3">
                                                                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                                                                <Users className="w-4 h-4" />
                                                                            </div>
                                                                            <p className="text-sm font-semibold text-gray-700">Coordinator (Head)</p>
                                                                        </div>
                                                                        <p className="font-bold text-gray-900 text-lg">{residence.coordinatorName}</p>
                                                                        <div className="mt-2 text-sm text-gray-500 space-y-1">
                                                                            {residence.coordinatorContact && <p>{residence.coordinatorContact}</p>}
                                                                            {residence.coordinatorEmail && <p className="truncate" title={residence.coordinatorEmail}>{residence.coordinatorEmail}</p>}
                                                                        </div>
                                                                    </div>

                                                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                                                                        <div className="flex items-center space-x-2 mb-3">
                                                                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                                                <Home className="w-4 h-4" />
                                                                            </div>
                                                                            <p className="text-sm font-semibold text-gray-700">Community Members</p>
                                                                        </div>
                                                                        <p className="font-bold text-3xl text-gray-900">
                                                                            {isLoadingDetails ? <Loader2 className="w-6 h-6 animate-spin inline text-gray-400" /> : residenceMembers.length}
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-gray-500">Currently assigned</p>
                                                                    </div>

                                                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                                                                        <div className="flex items-center space-x-2 mb-3">
                                                                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                                                                <Activity className="w-4 h-4" />
                                                                            </div>
                                                                            <p className="text-sm font-semibold text-gray-700">Total Souls Won</p>
                                                                        </div>
                                                                        <p className="font-bold text-3xl text-green-600">
                                                                            {reports.filter(r => r.residenceId === residence.id).reduce((sum, r) => sum + r.soulsWon, 0)}
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-gray-500">From outreach reports</p>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                                                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center">
                                                                        <h4 className="font-semibold text-gray-800 flex items-center">
                                                                            <Users className="w-4 h-4 mr-2 text-gray-500" />
                                                                            Assigned Members List
                                                                        </h4>
                                                                    </div>
                                                                    {isLoadingDetails ? (
                                                                        <div className="flex justify-center items-center py-12">
                                                                            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                                                                        </div>
                                                                    ) : residenceMembers.length > 0 ? (
                                                                        <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                                                                            {residenceMembers.map(m => (
                                                                                <li key={m.id} className="p-4 hover:bg-blue-50/50 flex items-center justify-between transition-colors">
                                                                                    <div className="flex items-center space-x-3">
                                                                                        <div className="bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-orange-200">
                                                                                            {m.name.charAt(0)}
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                                                                                            <p className="text-xs text-gray-500">{m.phone || 'No Phone'}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-600 font-medium">
                                                                                        {m.category || 'Member'}
                                                                                    </span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <div className="py-12 text-center flex flex-col items-center">
                                                                            <div className="bg-gray-50 p-3 rounded-full mb-3">
                                                                                <Users className="w-6 h-6 text-gray-400" />
                                                                            </div>
                                                                            <p className="text-sm font-medium text-gray-900">No members found</p>
                                                                            <p className="text-xs text-gray-500 mt-1">There are currently no members assigned to this residence.</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <p>No residences added yet. Click "Add Residence" to get started.</p>
                            </div>
                        )}
                    </div>
                </div >
            )}

            {/* Tab Content: Reports */}
            {
                activeTab === 'reports' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-ministry-text">Outreach Reports</h2>
                            <button
                                onClick={() => setShowAddReport(!showAddReport)}
                                className="px-4 py-2 bg-ministry-primary text-white rounded-lg hover:bg-ministry-primary/90 flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ministry-primary"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Submit Report
                            </button>
                        </div>

                        {showAddReport && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-medium mb-4">Submit Outreach Report</h3>
                                <form onSubmit={handleAddReport} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Residence</label>
                                            <select
                                                required
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ministry-primary focus:border-transparent outline-none bg-white"
                                                value={newReport.residence_id || ''}
                                                onChange={(e) => setNewReport({ ...newReport, residence_id: e.target.value })}
                                            >
                                                <option value="">Select a residence</option>
                                                {residences.map(res => (
                                                    <option key={res.id} value={res.id}>{res.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                            <input
                                                required
                                                type="date"
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ministry-primary focus:border-transparent outline-none"
                                                value={newReport.date || ''}
                                                onChange={(e) => setNewReport({ ...newReport, date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Souls Won</label>
                                            <input
                                                required
                                                type="number"
                                                min="0"
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ministry-primary focus:border-transparent outline-none"
                                                value={newReport.souls_won || 0}
                                                onChange={(e) => setNewReport({ ...newReport, souls_won: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Related Event (Optional)</label>
                                            <select
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ministry-primary focus:border-transparent outline-none bg-white"
                                                value={newReport.event_id || ''}
                                                onChange={(e) => setNewReport({ ...newReport, event_id: e.target.value })}
                                            >
                                                <option value="">None</option>
                                                {events.map(event => (
                                                    <option key={event.id} value={event.id}>{event.title} - {new Date(event.date).toLocaleDateString()}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Details</label>
                                            <textarea
                                                rows={3}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ministry-primary focus:border-transparent outline-none"
                                                value={newReport.notes || ''}
                                                onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
                                                placeholder="Describe the outreach activity, key interactions, or challenges..."
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddReport(false)}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-ministry-primary text-white rounded-lg hover:bg-ministry-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ministry-primary disabled:opacity-50"
                                            disabled={loading}
                                        >
                                            {loading ? 'Submitting...' : 'Submit Report'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {reports.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Residence</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Souls Won</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {reports.map((report) => (
                                                <tr key={report.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(report.date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {residences.find(r => r.id === report.residenceId)?.name || 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            {report.soulsWon}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={report.notes}>{report.notes || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    <p>No outreach reports submitted yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ResidentDashboard;
