import { useEffect, useRef, useState } from 'react';
import { OfflineQueue, OfflineQueueItem } from '../services/OfflineQueue';
import { apiFetch } from '../services/api';

const BASE_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 60000; // Cap at 60s
const SYNC_INTERVAL_MS = 60000;

export const useBackgroundSync = () => {
    const isProcessingRef = useRef(false);
    const authPausedRef = useRef(false);
    const [queueSize, setQueueSize] = useState(0);

    const processQueue = async () => {
        if (isProcessingRef.current || authPausedRef.current || !navigator.onLine) {
            return;
        }

        isProcessingRef.current = true;
        try {
            const queue = OfflineQueue.getQueue();
            setQueueSize(queue.length);
            
            for (const item of queue) {
                if (item.status === 'failed' || item.status === 'processing') {
                    // Skip terminal failures or items supposedly already processing
                    continue; 
                }

                // Check Exponential Backoff
                const backoffDelay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, item.retryCount), MAX_RETRY_DELAY_MS);
                if (item.retryCount > 0 && (Date.now() - item.updatedAt) < backoffDelay) {
                    continue; // Still waiting for backoff to expire
                }

                OfflineQueue.updateItem(item.id, { status: 'processing' });

                try {
                    if (item.type === 'SOUL_ADD') {
                        // FIX: Must use SoulsStore.add to properly map the camelCase payload to DB snake_case structure
                        const { SoulsStore } = await import('../database/soulsStore');
                        await SoulsStore.add(item.payload);
                    }
                    
                    // Success! Remove from queue.
                    OfflineQueue.removeItem(item.id);
                    console.log(`[Offline Sync] Successfully synced ${item.type} (ID: ${item.id})`);
                } catch (error: any) {
                    const msg = error.message || String(error);
                    
                    if (msg === 'SESSION_EXPIRED' || msg.includes('401') || msg.includes('Unauthorized')) {
                        console.warn('[Offline Sync] Auth token expired. Pausing queue.');
                        authPausedRef.current = true;
                        OfflineQueue.updateItem(item.id, { status: 'pending' }); // Reset so it retries later
                        break; // Stop entirely until auth restores
                    }
                    
                    if (msg === 'Failed to fetch' || msg.includes('timeout') || msg === 'Request timed out') {
                        // Network error: Increment retry count and apply backoff
                        console.log(`[Offline Sync] Network drop on ${item.id}. Retrying later...`);
                        OfflineQueue.updateItem(item.id, { 
                            status: 'pending', 
                            retryCount: item.retryCount + 1,
                            errorMsg: 'Network connection failed'
                        });
                    } else {
                        // 400/500 Validation Error -> Mark as Hard Failed, do not infinitely retry
                        console.error(`[Offline Sync] Hard failure on ${item.id}:`, msg);
                        OfflineQueue.updateItem(item.id, { 
                            status: 'failed', 
                            errorMsg: msg 
                        });
                    }
                }
            }
        } finally {
            isProcessingRef.current = false;
            setQueueSize(OfflineQueue.getQueue().length);
        }
    };

    useEffect(() => {
        // Initial setup routines
        processQueue();

        const intervalId = setInterval(() => {
            processQueue();
        }, SYNC_INTERVAL_MS);

        const handleOnline = () => {
            console.log('[Offline Sync] Connection restored. Flushing queue...');
            processQueue();
        };

        const handleAuthRestore = () => {
            if (authPausedRef.current) {
                console.log('[Offline Sync] Auth restored. Resuming queue...');
                authPausedRef.current = false;
                processQueue();
            }
        };

        const handleQueueUpdated = () => {
            setQueueSize(OfflineQueue.getQueue().length);
            // Optionally auto-trigger processing if a new item comes in
            processQueue();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('auth:restored', handleAuthRestore); // We can trigger this post-login
        window.addEventListener('offline-queue-updated', handleQueueUpdated);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('auth:restored', handleAuthRestore);
            window.removeEventListener('offline-queue-updated', handleQueueUpdated);
        };
    }, []);

    return { queueSize, processQueue };
};
