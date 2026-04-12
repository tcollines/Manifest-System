/**
 * FinanceContext
 *
 * Shared context + hook for the Finance module.
 * Separated from FinanceLayout.tsx for Vite Fast Refresh compliance
 * (files must not mix hook/context exports with component exports).
 */

import React, { createContext, useContext } from 'react';
import { Transaction, Requisition, Vehicle, Passenger, PickUpStation, MinistryEvent, User } from '../../types';

export interface FinanceContextValue {
    // Event selection
    selectedEventId: string;
    setSelectedEventId: (id: string) => void;
    selectedEvent: MinistryEvent | undefined;
    events: MinistryEvent[];

    // Data
    transactions: Transaction[];
    requisitions: Requisition[];
    vehicles: Vehicle[];
    passengers: Passenger[];
    pickupStations: PickUpStation[];
    availableCoordinators: User[];
    currency: string;

    // Summary
    financeSummary: { total_income: number; total_expense: number; net_balance: number; transaction_count: number };
    totalIncome: number;
    totalExpense: number;
    pendingRequisitions: number;

    // Refresh
    isRefreshing: boolean;
    refreshData: (eventId?: string) => Promise<void>;

    // Formatters
    formatMoney: (amount: number) => string;
    formatMoneyInput: (val: string) => string;
    parseMoneyInput: (val: string) => string;

    // Transaction modal
    showTransModal: boolean;
    setShowTransModal: (v: boolean) => void;
    transForm: { type: 'Income' | 'Expense'; category: string; amount: string; description: string; eventId: string; method: 'Cash' };
    setTransForm: (f: { type: 'Income' | 'Expense'; category: string; amount: string; description: string; eventId: string; method: 'Cash' }) => void;
    handleAddTransaction: (e: React.FormEvent) => Promise<void>;

    // Requisition payment modal
    payModalOpen: boolean;
    setPayModalOpen: (v: boolean) => void;
    selectedRequisition: Requisition | null;
    payForm: { amount: string; method: string; transactionId: string };
    setPayForm: (f: { amount: string; method: string; transactionId: string }) => void;
    handleOpenPaymentModal: (req: Requisition) => void;
    handleProcessPayment: (e: React.FormEvent) => Promise<void>;

    // Fleet
    fleetViewMode: 'events' | 'vehicles';
    setFleetViewMode: (m: 'events' | 'vehicles') => void;
    selectedFleetEvent: MinistryEvent | null;
    setSelectedFleetEvent: (e: MinistryEvent | null) => void;
    fleetJourneyTab: 'Ongoing' | 'Return' | 'Cleared' | 'All';
    setFleetJourneyTab: (t: 'Ongoing' | 'Return' | 'Cleared' | 'All') => void;

    // Vehicle detail modal
    selectedVehicle: Vehicle | null;
    setSelectedVehicle: (v: Vehicle | null) => void;
    financeForm: { dispatch: string; balance: string };
    setFinanceForm: (f: { dispatch: string; balance: string }) => void;

    // Fleet handlers
    getEventVehicles: () => Vehicle[];
    getVehicleJourneyStatus: (v: Vehicle) => 'Ongoing' | 'Return' | 'Cleared';
    handleOpenEventFleet: (event: MinistryEvent) => void;
    handleBackToEvents: () => void;
    handleViewVehicle: (v: Vehicle) => void;
    handleUpdateFinance: () => Promise<void>;
    handleDispatchVehicle: () => Promise<void>;
    handlePrintFleetReport: () => void;
    handlePrintAccountability: (vehicle: Vehicle) => Promise<void>;
    handlePrintBatchAccountability: (vehicles: Vehicle[]) => Promise<void>;
}

export const FinanceContext = createContext<FinanceContextValue | null>(null);

export const useFinance = (): FinanceContextValue => {
    const ctx = useContext(FinanceContext);
    if (!ctx) throw new Error('useFinance must be used inside FinanceLayout');
    return ctx;
};
