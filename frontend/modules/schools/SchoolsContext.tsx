import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, MinistryEvent, SchoolOutreachReport } from '../../types';
import { SchoolsStore, mapSchoolReportFromDB } from '../../database/schoolsStore';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface SchoolsContextValue {
    currentUser: User | null;
    events: MinistryEvent[];
    reports: SchoolOutreachReport[];
    reportEventId: string;
    setReportEventId: (id: string) => void;
    refreshReports: () => Promise<void>;
}

const SchoolsContext = createContext<SchoolsContextValue | undefined>(undefined);

export const SchoolsProvider: React.FC<{
    children: React.ReactNode;
    initialEvents: MinistryEvent[];
}> = ({ children, initialEvents }) => {
    const { user } = useAuth();
    const [reports, setReports] = useState<SchoolOutreachReport[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    
    const reportEventId = searchParams.get('eventId') || '';
    
    const setReportEventId = (id: string) => {
        setSearchParams(prev => {
            if (id) prev.set('eventId', id);
            else prev.delete('eventId');
            return prev;
        }, { replace: true });
    };

    const loadReports = async (eventId?: string) => {
        const data = await SchoolsStore.getAllReports(eventId);
        setReports(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    useEffect(() => {
        loadReports(reportEventId);

        const channel = supabase.channel('schools-reports-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'school_outreach_reports' }, (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;
                if (eventType === 'INSERT') {
                    const mapped = mapSchoolReportFromDB(newRecord);
                    if (!reportEventId || mapped.eventId === reportEventId) {
                        setReports(prev => [mapped, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    }
                } else if (eventType === 'UPDATE') {
                    const mapped = mapSchoolReportFromDB(newRecord);
                    if (!reportEventId || mapped.eventId === reportEventId) {
                        setReports(prev => prev.map(r => r.id === mapped.id ? mapped : r).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    } else {
                        setReports(prev => prev.filter(r => r.id !== mapped.id));
                    }
                } else if (eventType === 'DELETE') {
                    setReports(prev => prev.filter(r => r.id !== oldRecord.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [reportEventId]);

    const value: SchoolsContextValue = {
        currentUser: user,
        events: initialEvents,
        reports,
        reportEventId,
        setReportEventId,
        refreshReports: () => loadReports(reportEventId)
    };

    return (
        <SchoolsContext.Provider value={value}>
            {children}
        </SchoolsContext.Provider>
    );
};

export const useSchoolsContext = () => {
    const context = useContext(SchoolsContext);
    if (context === undefined) {
        throw new Error('useSchoolsContext must be used within a SchoolsProvider');
    }
    return context;
};
