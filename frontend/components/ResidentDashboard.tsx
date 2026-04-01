import React, { useState, useEffect } from 'react';
import { useResidentStore } from '../database/residentStore';
import { User, MinistryEvent, Residence, ResidenceOutreachReport } from '../types';
import { MapPin, Users, Calendar, Activity, Loader2, Plus, Home, ClipboardList, TrendingUp, Search, Check, ChevronRight, ChevronLeft, Eye, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { MemberStore } from '../database/memberStore';
import OverviewTab from './residents/OverviewTab';
import ReportsTab from './residents/ReportsTab';
import ResidencesTab from './residents/ResidencesTab';

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
            {activeTab === 'overview' && <OverviewTab reports={reports} residences={residences} totalSoulsWon={totalSoulsWon} totalResidences={totalResidences} recentReports={recentReports} />}

            {/* Tab Content: Residences */}
            {activeTab === 'residences' && <ResidencesTab residences={residences} reports={reports} events={events} fetchResidenceMembers={fetchResidenceMembers} deleteResidence={deleteResidence} addResidence={addResidence} />}

            {/* Tab Content: Reports */}
            {activeTab === 'reports' && <ReportsTab reports={reports} residences={residences} events={events} addReport={addReport} loading={loading} />}

        </div >
    );
};

export default ResidentDashboard;
