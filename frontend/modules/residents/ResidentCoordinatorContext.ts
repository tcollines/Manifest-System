/**
 * ResidentCoordinatorContext
 *
 * Shared context + hook for the Resident Coordinator module.
 * Separated from ResidentCoordinatorLayout.tsx for Vite Fast Refresh compliance.
 * Pattern mirrors FinanceContext / FollowUpContext exactly.
 */

import React, { createContext, useContext } from 'react';
import { Member, MinistryEvent, Passenger, Residence, ResidenceOutreachReport, Soul } from '../../types';

export interface ResidentCoordinatorContextValue {
    // Core data
    myResidence: Residence | null;
    members: Member[];
    events: MinistryEvent[];
    residenceSouls: Soul[];
    reports: ResidenceOutreachReport[];
    isLoadingInit: boolean;

    // Event confirmation
    selectedEvent: MinistryEvent | null;
    setSelectedEvent: (event: MinistryEvent | null) => void;
    confirmedPassengers: Passenger[];
    handleConfirmToggle: (member: Member) => Promise<void>;

    // Report submission
    newReport: Partial<ResidenceOutreachReport>;
    setNewReport: (r: Partial<ResidenceOutreachReport>) => void;
    handleAddReport: (e: React.FormEvent) => Promise<void>;
    isSubmitting: boolean;
}

export const ResidentCoordinatorContext = createContext<ResidentCoordinatorContextValue | null>(null);

export const useResidentCoordinator = (): ResidentCoordinatorContextValue => {
    const ctx = useContext(ResidentCoordinatorContext);
    if (!ctx) throw new Error('useResidentCoordinator must be used inside ResidentCoordinatorLayout');
    return ctx;
};
