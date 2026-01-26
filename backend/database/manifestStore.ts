
import { ManifestDetails } from '../types';
import { supabase } from '../services/supabaseClient';

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
        const { data, error } = await supabase.from('manifest_details').select('*').single();
        if (error || !data) return DEFAULT_MANIFEST;
        return {
            name: data.name,
            contact: data.contact,
            address: data.address,
            description: data.description,
            logoUrl: data.logo_url,
            coordinates: data.coordinates,
            currency: data.currency
        };
    },
    
    save: async (details: ManifestDetails) => {
        const payload = {
            id: '1', // Singleton row
            name: details.name,
            contact: details.contact,
            address: details.address,
            description: details.description,
            logo_url: details.logoUrl,
            coordinates: details.coordinates,
            currency: details.currency
        };
        
        const { error } = await supabase.from('manifest_details').upsert(payload);
        if (error) console.error('Error saving manifest:', error);
        return details;
    }
};
