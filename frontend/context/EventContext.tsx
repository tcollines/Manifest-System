import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MinistryEvent } from '../types';
import { EventStore } from '../database/eventStore';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

// ─── Context shape ────────────────────────────────────────────────────────────

interface EventContextValue {
    events: MinistryEvent[];
    refreshEvents: () => Promise<void>;
    addEvent: (event: MinistryEvent) => void;
    isLoading: boolean;
}

const EventContext = createContext<EventContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [events, setEvents] = useState<MinistryEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await EventStore.getAll({ limit: 200 });
            if (res.status === 'success' && res.data) setEvents(res.data);
        } catch (e) {
            console.error('[EventContext] refreshEvents failed:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Optimistic add — caller gets instant feedback; realtime will reconcile
    const addEvent = useCallback((event: MinistryEvent) => {
        setEvents(prev => {
            if (prev.some(e => e.id === event.id)) return prev;
            return [event, ...prev].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
        });
    }, []);

    // Initial fetch once user is available
    useEffect(() => {
        if (!user) return;
        refreshEvents();
    }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Realtime subscription
    useEffect(() => {
        if (!user) return;

        const sub = supabase
            .channel('event-context:ministry_events')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ministry_events' },
                (payload) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload;
                    setEvents(prev => {
                        let next: MinistryEvent[];
                        if (eventType === 'INSERT') {
                            if (prev.some(e => e.id === newRecord.id)) return prev;
                            next = [newRecord as MinistryEvent, ...prev];
                        } else if (eventType === 'UPDATE') {
                            next = prev.map(e =>
                                e.id === newRecord.id ? (newRecord as MinistryEvent) : e
                            );
                        } else if (eventType === 'DELETE') {
                            next = prev.filter(e => e.id !== oldRecord.id);
                        } else {
                            return prev;
                        }
                        return next.sort(
                            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                        );
                    });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [user?.id]);

    return (
        <EventContext.Provider value={{ events, refreshEvents, addEvent, isLoading }}>
            {children}
        </EventContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useEvent = (): EventContextValue => {
    const ctx = useContext(EventContext);
    if (!ctx) throw new Error('useEvent must be used inside <EventProvider>');
    return ctx;
};
