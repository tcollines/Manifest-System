import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CampusActivity, CampusFinance, MinistryEvent, User } from '../../types';
import { CampusStore } from '../../database/campusStore';
import { useAuth } from '../../context/AuthContext';

interface CampusStats {
    totalSouls: number;
    totalFamilies: number;
    totalEvangelisms: number;
    totalAlumni: number;
}

interface CampusContextType {
    activities: CampusActivity[];
    financeRecords: CampusFinance[];
    stats: CampusStats;
    selectedEventId: string;
    setSelectedEventId: (id: string) => void;
    events: MinistryEvent[];
    setEvents: (events: MinistryEvent[]) => void;
    currentUser: User | null;
    refreshStats: () => Promise<void>;
    loading: boolean;
}

const CampusContext = createContext<CampusContextType | undefined>(undefined);

export const CampusProvider: React.FC<{ children: React.ReactNode, initialEvents: MinistryEvent[] }> = ({ children, initialEvents }) => {
    const { user: currentUser } = useAuth();
    
    // We synchronize the global selected event through Context instead of the URL here, or we could lift the search param.
    // Given the architecture, using state here simplifies data access.
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [events, setEvents] = useState<MinistryEvent[]>(initialEvents);
    
    // Core data state
    const [activities, setActivities] = useState<CampusActivity[]>([]);
    const [financeRecords, setFinanceRecords] = useState<CampusFinance[]>([]);
    
    // Aggregated stats
    const [stats, setStats] = useState<CampusStats>({
        totalSouls: 0,
        totalFamilies: 0,
        totalEvangelisms: 0,
        totalAlumni: 0
    });
    
    const [loading, setLoading] = useState(true);

    const refreshStats = useCallback(async () => {
        try {
            setLoading(true);
            const fetchedActivities = await CampusStore.getActivities(selectedEventId);
            if (fetchedActivities) {
                setActivities(fetchedActivities);
                
                setStats({
                    totalFamilies: fetchedActivities.filter(a => a.category === 'Family').length,
                    totalEvangelisms: fetchedActivities.filter(a => a.category === 'Evangelism').length,
                    totalAlumni: fetchedActivities.filter(a => a.category === 'Alumni').length,
                    totalSouls: fetchedActivities.reduce((acc, current) => acc + (current.soulsWon || 0), 0)
                });
            }

            const fetchedFinance = await CampusStore.getFinanceRecords(selectedEventId);
            if (fetchedFinance) {
                setFinanceRecords(fetchedFinance);
            }
        } catch (e) {
            console.error('Failed to fetch campus data', e);
        } finally {
            setLoading(false);
        }
    }, [selectedEventId]);

    // Re-fetch when the selectedEventId changes
    useEffect(() => {
        refreshStats();
    }, [refreshStats]);

    return (
        <CampusContext.Provider value={{
            activities,
            financeRecords,
            stats,
            selectedEventId,
            setSelectedEventId,
            events,
            setEvents,
            currentUser,
            refreshStats,
            loading
        }}>
            {children}
        </CampusContext.Provider>
    );
};

export const useCampus = () => {
    const context = useContext(CampusContext);
    if (context === undefined) {
        throw new Error('useCampus must be used within a CampusProvider');
    }
    return context;
};
