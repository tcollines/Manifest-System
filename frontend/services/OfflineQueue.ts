export interface OfflineQueueItem {
    id: string;
    type: 'SOUL_ADD'; // Extensible for future offline actions
    payload: any;
    status: 'pending' | 'processing' | 'failed';
    retryCount: number;
    errorMsg?: string;
    dedupeKey?: string; // Used to prevent duplicate queues of the same underlying resource
    version: number;
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'MANIFEST_OFFLINE_QUEUE';

export const OfflineQueue = {
    getQueue: (): OfflineQueueItem[] => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to parse offline queue from localStorage', e);
            return [];
        }
    },

    saveQueue: (queue: OfflineQueueItem[]): void => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
            window.dispatchEvent(new Event('offline-queue-updated'));
        } catch (e) {
            console.error('Failed to save offline queue to localStorage', e);
        }
    },

    enqueue: (itemInput: Omit<OfflineQueueItem, 'id' | 'status' | 'retryCount' | 'version' | 'createdAt' | 'updatedAt'>): void => {
        const queue = OfflineQueue.getQueue();
        
        // Deduplication Check
        if (itemInput.dedupeKey) {
            const existingIndex = queue.findIndex(q => q.dedupeKey === itemInput.dedupeKey);
            if (existingIndex >= 0) {
                // Update existing item instead of duplicating
                queue[existingIndex] = {
                    ...queue[existingIndex],
                    payload: itemInput.payload,
                    status: 'pending', // reset status ready to process
                    updatedAt: Date.now(),
                    version: queue[existingIndex].version + 1,
                    retryCount: 0,
                    errorMsg: undefined
                };
                OfflineQueue.saveQueue(queue);
                return;
            }
        }

        const newItem: OfflineQueueItem = {
            ...itemInput,
            id: crypto.randomUUID(),
            status: 'pending',
            retryCount: 0,
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        queue.push(newItem);
        OfflineQueue.saveQueue(queue);
    },

    dequeue: (id: string): OfflineQueueItem | null => {
        const queue = OfflineQueue.getQueue();
        const index = queue.findIndex(q => q.id === id);
        if (index === -1) return null;
        
        const [item] = queue.splice(index, 1);
        OfflineQueue.saveQueue(queue);
        return item;
    },

    removeItem: (id: string): void => {
        const queue = OfflineQueue.getQueue();
        const newQueue = queue.filter(q => q.id !== id);
        OfflineQueue.saveQueue(newQueue);
    },

    updateItem: (id: string, updates: Partial<OfflineQueueItem>): void => {
        const queue = OfflineQueue.getQueue();
        const index = queue.findIndex(q => q.id === id);
        if (index === -1) return;

        queue[index] = {
            ...queue[index],
            ...updates,
            updatedAt: Date.now(),
            version: queue[index].version + 1
        };
        OfflineQueue.saveQueue(queue);
    }
};
