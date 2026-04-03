import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

export const getPublicResidence = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('residences')
            .select('id, name, coordinator_name, created_at')
            .eq('id', id)
            .single();
            
        if (error || !data) {
            return res.status(404).json({ error: 'Residence not found' });
        }
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const submitPublicSouls = async (req: Request, res: Response) => {
    const { residenceId, souls } = req.body;
    
    if (!residenceId || !Array.isArray(souls) || souls.length === 0) {
        return res.status(400).json({ error: 'Invalid payload' });
    }

    try {
        const { data: residence, error: residenceError } = await supabase
                .from('residences')
                .select('manifest_id, name')
                .eq('id', residenceId)
                .single();
        
        if (residenceError || !residence) {
            return res.status(404).json({ error: 'Residence not found' });
        }
        
        const manifestId = residence.manifest_id;

        const formattedSouls = souls.map((s: any) => ({
            id: uuidv4(),
            manifest_id: manifestId,
            first_name: s.firstName,
            last_name: s.lastName,
            phone: s.phone,
            gender: s.gender,
            residence: s.residence,
            status: 'New',
            source_type: 'Residential',
            source_id: residenceId,
            captured_by: s.capturedBy,
            notes: s.notes
        }));

        const { minorsCount } = req.body;
        if (minorsCount && typeof minorsCount === 'number' && minorsCount > 0) {
            const defaultLabourer = souls.length > 0 ? souls[0].capturedBy : 'Public Link';
            for (let i = 0; i < minorsCount; i++) {
                formattedSouls.push({
                    id: uuidv4(),
                    manifest_id: manifestId,
                    first_name: 'Minor',
                    last_name: 'Soul',
                    phone: null,
                    gender: 'Male', // Default required by schema
                    residence: residence.name || null,
                    status: 'New',
                    source_type: 'Residential',
                    source_id: residenceId,
                    captured_by: defaultLabourer,
                    notes: 'Anonymous minor added via Residential Public Link'
                });
            }
        }
        
        const { error } = await supabase.from('souls').insert(formattedSouls);
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.status(201).json({ success: true, count: formattedSouls.length });
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};
