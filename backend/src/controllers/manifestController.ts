import { Request, Response } from 'express';
import { supabase } from '../supabase';

const DEFAULT_MANIFEST = {
    name: 'Ministry Manifest',
    contact: '256700000000',
    address: 'Plot 45, Ministry Road',
    description: 'A global movement impacting the world.',
    coordinates: { lat: 0.3476, lng: 32.5825 },
    currency: 'UGX'
};

export const getManifest = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('manifest_details').select('*').single();
        if (error || !data) return res.json(DEFAULT_MANIFEST);

        res.json({
            name: data.name,
            contact: data.contact,
            address: data.address,
            description: data.description,
            logoUrl: data.logo_url,
            coordinates: data.coordinates,
            currency: data.currency
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const saveManifest = async (req: Request, res: Response) => {
    const details = req.body;
    try {
        const payload = {
            id: '1',
            name: details.name,
            contact: details.contact,
            address: details.address,
            description: details.description,
            logo_url: details.logoUrl,
            coordinates: details.coordinates,
            currency: details.currency
        };
        const { error } = await supabase.from('manifest_details').upsert(payload);
        if (error) throw error;
        res.json(details);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
