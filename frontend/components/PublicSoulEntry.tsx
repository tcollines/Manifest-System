import React, { useState, useEffect, useCallback } from 'react';
import { useNotification } from './ui/NotificationSystem';
import { Globe, ArrowLeft, CheckCircle, WifiOff } from 'lucide-react';
import SoulEntryForm from './SoulEntryForm';
import { MinistryEvent, Soul } from '../types';
import { apiFetch } from '../services/api';

const OFFLINE_QUEUE_KEY = 'OFFLINE_SOULS_QUEUE';

const PublicSoulEntry: React.FC = () => {
    const { showToast } = useNotification();
    // Manually parse ID from URL since we aren't using React Router provider
    const pathParts = window.location.pathname.split('/');
    // Assuming /collect-souls/:eventId
    const eventId = pathParts.find(part => part.startsWith('evt-')) || pathParts[pathParts.length - 1];
    const [eventData, setEventData] = useState<MinistryEvent | null>(null);
    const [status, setStatus] = useState<'loading' | 'active' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const syncOfflineQueue = useCallback(async () => {
        if (!navigator.onLine) return;
        
        try {
            const queueStr = localStorage.getItem(OFFLINE_QUEUE_KEY);
            if (!queueStr) return;
            
            const queue = JSON.parse(queueStr);
            if (!Array.isArray(queue) || queue.length === 0) return;
            
            let remainingQueue = [...queue];
            
            for (let i = 0; i < queue.length; i++) {
                const item = queue[i];
                try {
                    await apiFetch('/public/events/souls', {
                        method: 'POST',
                        body: JSON.stringify({
                            eventId: item.eventId,
                            souls: item.souls
                        })
                    });
                    remainingQueue = remainingQueue.filter(q => q.timestamp !== item.timestamp);
                    showToast(`Successfully synced an offline entry!`, 'success');
                } catch (e) {
                    console.error("Failed to sync queue item", e);
                    break;
                }
            }
            
            if (remainingQueue.length > 0) {
                localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
            } else {
                localStorage.removeItem(OFFLINE_QUEUE_KEY);
            }
        } catch (e) {
            console.error("Error reading offline queue", e);
        }
    }, [showToast]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            syncOfflineQueue();
            showToast("You are back online. Synchronizing data...", "info");
        };
        const handleOffline = () => {
            setIsOffline(true);
            showToast("You are offline. Submissions will be saved locally.", "warning");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        if (navigator.onLine) {
            syncOfflineQueue();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncOfflineQueue, showToast]);

    useEffect(() => {
        const fetchData = async () => {
            if (!eventId) {
                setStatus('error');
                setErrorMsg('Invalid Event Link');
                return;
            }
            try {
                const data = await apiFetch(`/public/events/${eventId}`);
                if (data && data.id) {
                    setEventData(data);
                    setStatus('active');
                } else {
                    setStatus('error');
                    setErrorMsg('Event not found or link expired.');
                }
            } catch (e) {
                setStatus('error');
                setErrorMsg('Failed to load event details.');
            }
        };
        fetchData();
    }, [eventId]);

    const saveToOfflineQueue = (payload: any) => {
        const queueStr = localStorage.getItem(OFFLINE_QUEUE_KEY);
        let queue = [];
        if (queueStr) {
            try { queue = JSON.parse(queueStr); } catch (e) {}
        }
        queue.push(payload);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        showToast("Saved offline. Will sync when connected.", "info");
    };

    const handleSubmit = async (data: Omit<Soul, 'id' | 'createdAt'>) => {
        const payload = {
            eventId: eventId!,
            souls: [{
                ...data,
                capturedBy: 'Public Link'
            }],
            timestamp: Date.now()
        };

        if (!navigator.onLine) {
            saveToOfflineQueue(payload);
            setStatus('success');
            return;
        }

        try {
            await apiFetch('/public/events/souls', {
                method: 'POST',
                body: JSON.stringify({
                    eventId: payload.eventId,
                    souls: payload.souls
                })
            });
            setStatus('success');
        } catch (e: any) {
            console.error(e);
            if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('Network Error') || e.message.includes('Failed to load'))) {
                saveToOfflineQueue(payload);
                setStatus('success');
            } else {
                showToast("Failed to submit. Please try again.", 'error');
            }
        }
    };

    const handleBack = () => {
        setStatus('active');
    };

    if (status === 'loading') {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading Event...</div>;
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-green-100">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Hallelujah!</h2>
                    <p className="text-gray-600 mb-6">Soul successfully registered for <strong>{eventData?.title}</strong>.</p>

                    <button
                        onClick={handleBack}
                        className="w-full py-3 bg-ministry-orange text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
                    >
                        Register Another Soul
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Link Error</h2>
                    <p className="text-gray-500">{errorMsg}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Brand Header */}
            <div className="bg-black text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="bg-ministry-neon p-1.5 rounded-lg">
                            <Globe className="w-4 h-4 text-black" />
                        </div>
                        <span className="font-bold tracking-wider text-sm">Follow-up</span>
                        {isOffline && (
                            <span className="ml-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center">
                                <WifiOff className="w-3 h-3 mr-1" /> Offline Mode
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-white/60">
                        {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 md:pt-8 pb-20">
                <div className="mb-6">
                    <span className="text-xs font-bold text-ministry-orange uppercase tracking-wider">Soul Winning for</span>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">{eventData?.title}</h1>
                    <p className="text-gray-500 text-sm mt-1">{eventData?.date} • {eventData?.location}</p>
                </div>

                <SoulEntryForm
                    sourceType={eventData?.type || 'Event'}
                    sourceId={eventId!}
                    eventId={eventId}
                    onSubmit={handleSubmit}
                />

                <div className="mt-8 text-center text-xs text-gray-400">
                    Manifest Management System &copy; {new Date().getFullYear()}
                </div>
            </div>
        </div>
    );
};

export default PublicSoulEntry;
