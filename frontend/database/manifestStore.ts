
import { ManifestDetails } from '../types';
import { apiFetch } from '../services/api';

const DEFAULT_MANIFEST: ManifestDetails = {
    name: 'Ministry Manifest',
    contact: '256700000000',
    address: 'Plot 45, Ministry Road',
    description: 'A global movement impacting the world.',
    coordinates: { lat: 0.3476, lng: 32.5825 },
    currency: 'UGX'
};

export const ManifestStore = {
    get: async (): Promise<ManifestDetails> => {
        try {
            return await apiFetch('/manifest');
        } catch (error) {
            return DEFAULT_MANIFEST;
        }
    },

    save: async (details: ManifestDetails) => {
        try {
            return await apiFetch('/manifest', {
                method: 'POST',
                body: JSON.stringify(details)
            });
        } catch (error) {
            console.error('Error saving manifest:', error);
            throw error;
        }
    }
};
