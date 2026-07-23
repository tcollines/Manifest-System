import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, MinistryEvent, Residence, ResidenceOutreachReport } from '../../types';
import { useResidentStore } from '../../database/residentStore';
import { useAuth } from '@/context/AuthContext';

interface ResidentContextValue {
    currentUser: User | null;
    events: MinistryEvent[];
    residences: Residence[];
    reports: ResidenceOutreachReport[];
    loadingContext: boolean;
    errorContext: string | null;
    fetchResidencesProvider: () => Promise<void>;
    fetchReportsProvider: () => Promise<void>;
    addResidenceProvider: (residence: Omit<Residence, 'id' | 'manifest_id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
    deleteResidenceProvider: (id: string) => Promise<boolean>;
    fetchResidenceMembersProvider: (id: string) => Promise<any[]>;
    addReportProvider: (report: Omit<ResidenceOutreachReport, 'id' | 'manifest_id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
}

const ResidentContext = createContext<ResidentContextValue | undefined>(undefined);

export const ResidentProvider: React.FC<{
    children: React.ReactNode;
    initialEvents: MinistryEvent[];
}> = ({ children, initialEvents }) => {
    const { user } = useAuth();
    const store = useResidentStore();

    useEffect(() => {
        store.fetchResidences();
        store.fetchReports();
    }, []);

    const value: ResidentContextValue = {
        currentUser: user,
        events: initialEvents,
        residences: store.residences,
        reports: store.reports,
        loadingContext: store.loading,
        errorContext: store.error,
        fetchResidencesProvider: store.fetchResidences,
        fetchReportsProvider: store.fetchReports,
        addResidenceProvider: store.addResidence,
        deleteResidenceProvider: store.deleteResidence,
        fetchResidenceMembersProvider: store.fetchResidenceMembers,
        addReportProvider: store.addReport
    };

    return (
        <ResidentContext.Provider value={value}>
            {children}
        </ResidentContext.Provider>
    );
};

export const useResidentContext = () => {
    const context = useContext(ResidentContext);
    if (context === undefined) {
        throw new Error('useResidentContext must be used within a ResidentProvider');
    }
    return context;
};
