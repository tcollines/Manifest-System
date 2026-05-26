import React, { useEffect, useState } from 'react';
import { CloudUpload, AlertCircle, Loader2 } from 'lucide-react';
import { OfflineQueue } from '../services/OfflineQueue';
import { useBackgroundSync } from '../hooks/useBackgroundSync';

export const SyncIndicator: React.FC = () => {
    // Mount the global background sync engine here, or just listen to it.
    // If mounted globally in App.tsx, the hook will handle syncing. We just use the queue state.
    const { queueSize, processQueue } = useBackgroundSync();
    const [hasFailures, setHasFailures] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const checkStatus = () => {
            const queue = OfflineQueue.getQueue();
            const failed = queue.some(i => i.status === 'failed');
            setHasFailures(failed);
        };
        
        checkStatus();
        window.addEventListener('offline-queue-updated', checkStatus);
        return () => window.removeEventListener('offline-queue-updated', checkStatus);
    }, []);

    if (queueSize === 0) return null;

    const handleManualSync = () => {
        const queue = OfflineQueue.getQueue();
        let changed = false;
        queue.forEach(item => {
            if (item.status === 'failed') {
                OfflineQueue.updateItem(item.id, { status: 'pending', retryCount: 0, errorMsg: undefined });
                changed = true;
            }
        });
        if (changed) {
            console.log("Resetting failed offline items for retry...");
        }
        processQueue();
    };

    return (
        <div 
            className={`fixed bottom-24 md:bottom-4 right-4 z-50 flex items-center p-3 rounded-full shadow-lg transition-all cursor-pointer ${hasFailures ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-900 text-white'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleManualSync}
            title={hasFailures ? "Some offline items failed to sync due to data errors." : "Syncing offline items..."}
        >
            <div className="relative">
                {hasFailures ? (
                    <AlertCircle className="w-5 h-5" />
                ) : (
                    <CloudUpload className="w-5 h-5 animate-pulse" />
                )}
                <div className={`absolute -top-2 -right-2 w-4 h-4 text-[10px] font-bold flex items-center justify-center rounded-full ${hasFailures ? 'bg-red-600 text-white' : 'bg-ministry-orange text-white'}`}>
                    {queueSize}
                </div>
            </div>

            {isHovered && (
                <div className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300">
                    {hasFailures ? `${queueSize} Sync Errors` : `Syncing ${queueSize} items`}
                </div>
            )}
        </div>
    );
};
