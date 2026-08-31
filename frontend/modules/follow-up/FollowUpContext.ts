/**
 * FollowUpContext
 *
 * Shared context + hook for the Follow-Up module.
 * Separated from FollowUpLayout.tsx for Vite Fast Refresh compliance.
 * Pattern mirrors FinanceContext / TransportContext exactly.
 */

import React, { createContext, useContext } from 'react';
import { MinistryEvent, Soul, Member } from '../../types';

export interface FollowUpContextValue {
    // Event/Service selections
    selectedEventId: string | null;
    setSelectedEventId: (id: string | null) => void;

    // Core data
    events: MinistryEvent[];
    services: MinistryEvent[];
    souls: Soul[];
    isLoading: boolean;

    // Refresh
    loadData: () => Promise<void>;

    // Add soul form (modal hosted in layout)
    showAddSoulForm: boolean;
    setShowAddSoulForm: (v: boolean) => void;
    editingSoul: Soul | null;
    setEditingSoul: (s: Soul | null) => void;
    handleAddSoul: (soulData: Omit<Soul, 'id' | 'createdAt'>) => Promise<void>;

    // Link copy
    copiedLinkId: string | null;
    handleCopyLink: (eventId: string) => void;

    // Soul search (for services detail view)
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    memberSearchResults: Member[];
    isSearchingMembers: boolean;

    // Database tab
    dbEventFilter: string;
    setDbEventFilter: (f: string) => void;
    viewMode: 'list' | 'soul-detail' | 'member-detail';
    setViewMode: (m: 'list' | 'soul-detail' | 'member-detail') => void;
    selectedSoulDetails: any | null;
    handleViewSoul: (soulId: string) => Promise<void>;

    // Members DB tab
    membersDb: Member[];
    totalMembersDb: number;
    membersDbQuery: string;
    setMembersDbQuery: (q: string) => void;
    membersDbPage: number;
    setMembersDbPage: (p: number | ((prev: number) => number)) => void;
    isSearchingMembersDb: boolean;
    itemsPerPage: number;
    selectedMemberDetails: any | null;
    isEditingMember: boolean;
    setIsEditingMember: (v: boolean) => void;
    memberFormData: {
        name: string; phone: string; category: string; residence: string;
        occupation: string; placeOfWork: string; followUpStatus: string; followUpNotes: string;
    };
    setMemberFormData: (f: any) => void;
    handleViewMemberDb: (id: string) => Promise<void>;
    handleUpdateMemberDb: (e: React.FormEvent) => Promise<void>;

    // Analysis tab
    analysisData: any[];
    isLoadingAnalysis: boolean;
    analysisPage: number;
    setAnalysisPage: (p: number | ((prev: number) => number)) => void;
    analysisItemsPerPage: number;
    analysisFilter: 'pending' | 'followed';
    setAnalysisFilter: (f: 'pending' | 'followed') => void;
    viewModeAnalysis: 'list' | 'detail';
    setViewModeAnalysis: (m: 'list' | 'detail') => void;
    selectedAnalysisMember: any | null;
    handleViewAnalysisDetail: (id: string, basicRecord: any) => Promise<void>;
    handleSaveFollowUp: (e: React.FormEvent) => Promise<void>;

    // Active tab hint (for SoulEntryForm sourceType)
    activeTab: string;
}

export const FollowUpContext = createContext<FollowUpContextValue | null>(null);

export const useFollowUp = (): FollowUpContextValue => {
    const ctx = useContext(FollowUpContext);
    if (!ctx) throw new Error('useFollowUp must be used inside FollowUpLayout');
    return ctx;
};
