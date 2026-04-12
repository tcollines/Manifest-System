/**
 * TransportContext
 *
 * Shared context + hook for the Transportation module.
 * Separated from TransportationLayout.tsx to satisfy Vite Fast Refresh
 * (files must not mix hook/context exports with component exports).
 */

import React, { createContext, useContext } from 'react';
import { MinistryEvent, Vehicle, User, Passenger, JourneyStage } from '../../types';
import { ExtendedStation } from '../../database/logisticsStore';
import { TrackedVehicle } from './types';

export interface TransportContextValue {
    // Event selection
    selectedEventId: string;
    setSelectedEventId: (id: string) => void;
    selectedEvent: MinistryEvent | undefined;
    filteredEvents: MinistryEvent[];

    // Data
    vehicles: TrackedVehicle[];
    passengers: Passenger[];
    coordinators: User[];
    dbStations: ExtendedStation[];
    setDbStations: (stations: ExtendedStation[]) => void;

    // Coordinator view state
    isCoordinatorView: boolean;
    myVehicle: Vehicle | null;

    // Admin fleet state
    filterStatus: 'All' | 'Pending' | 'En Route' | 'Arrived' | 'Completed';
    setFilterStatus: (s: 'All' | 'Pending' | 'En Route' | 'Arrived' | 'Completed') => void;
    isAssigning: string | null;
    setIsAssigning: (id: string | null) => void;
    selectedCoordinator: string;
    setSelectedCoordinator: (name: string) => void;
    adminViewMode: 'list' | 'detail';
    setAdminViewMode: (m: 'list' | 'detail') => void;
    selectedAdminVehicle: TrackedVehicle | null;
    setSelectedAdminVehicle: (v: TrackedVehicle | null) => void;
    adminVehiclePassengers: Passenger[];
    adminDetailTab: 'manifest' | 'live' | 'report';
    setAdminDetailTab: (t: 'manifest' | 'live' | 'report') => void;

    // Coordinator journey state
    activeJourneyTab: 'Ongoing' | 'Return';
    isVehicleOpen: boolean;
    setIsVehicleOpen: (v: boolean) => void;
    returnPassengerForm: { name: string; contact: string; residence: string };
    setReturnPassengerForm: (f: { name: string; contact: string; residence: string }) => void;
    submittingStage: string | null;
    showHighlights: boolean;
    setShowHighlights: (v: boolean) => void;

    // Handlers
    refreshData: (eventId?: string) => Promise<void>;
    handleStageUpdate: (stage: JourneyStage) => Promise<void>;
    handleToggleVerify: (passengerId: string) => Promise<void>;
    handleAddReturnPassenger: (e: React.FormEvent) => Promise<void>;
    handleMarkSoulWon: (passengerId: string) => Promise<void>;
    handleAssignCoordinator: (vehicleId: string) => Promise<void>;
    handleAddCoordinator: (e: React.FormEvent, form: {
        firstName: string; lastName: string; username: string;
        password: string; contact: string; stationId: string;
        roleType: 'vehicle' | 'stage';
    }) => Promise<void>;
    handleDeleteCoordinator: (id: string) => Promise<void>;
    handleOpenAdminVehicle: (vehicle: TrackedVehicle) => Promise<void>;
    handleBackToFleet: () => void;
    handleRemovePassenger: (passengerId: string) => Promise<void>;
    switchJourneyTab: (tab: 'Ongoing' | 'Return', vehicleOverride?: Vehicle) => Promise<void>;
    handlePrintReport: () => void;
    isReturnAvailable: boolean;
    isJourneyComplete: boolean;
    cognitoFormUrl: string;
}

export const TransportContext = createContext<TransportContextValue | null>(null);

export const useTransport = (): TransportContextValue => {
    const ctx = useContext(TransportContext);
    if (!ctx) throw new Error('useTransport must be inside TransportationLayout');
    return ctx;
};
