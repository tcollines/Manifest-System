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
            currency: data.currency,
            soulsTarget: data.souls_target
        });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const saveManifest = async (req: Request, res: Response) => {
    const details = req.body;
    try {
        const payload = {
            name: details.name,
            contact: details.contact,
            address: details.address,
            description: details.description,
            logo_url: details.logoUrl,
            coordinates: details.coordinates,
            currency: details.currency,
            souls_target: details.soulsTarget
        };
        
        const { data: existing } = await supabase.from('manifest_details').select('id').limit(1).single();
        let queryError = null;

        if (existing && existing.id) {
            const { error: updateError } = await supabase.from('manifest_details').update(payload).eq('id', existing.id);
            queryError = updateError;
        } else {
            const { error: insertError } = await supabase.from('manifest_details').insert(payload);
            queryError = insertError;
        }

        if (queryError) throw queryError;
        res.json(details);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
