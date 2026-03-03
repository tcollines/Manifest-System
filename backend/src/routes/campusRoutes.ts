import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

// GET /campus/activities
router.get('/activities', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('campus_activities')
            .select('*')
            .eq('manifest_id', manifestId)
            .order('date', { ascending: false });

        if (error) throw error;

        const mappedData = data.map((item: any) => ({
            id: item.id,
            category: item.category,
            title: item.title,
            date: item.date,
            location: item.location,
            soulsWon: item.souls_won,
            contactsCollected: item.contacts_collected,
            notes: item.notes,
            createdAt: item.created_at,
            createdBy: item.created_by
        }));

        res.json(mappedData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /campus/activities
router.post('/activities', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { category, title, date, location, soulsWon, contactsCollected, notes, createdBy } = req.body;

        const { data, error } = await supabase
            .from('campus_activities')
            .insert([{
                manifest_id: manifestId,
                category,
                title,
                date,
                location,
                souls_won: soulsWon || 0,
                contacts_collected: contactsCollected || 0,
                notes,
                created_by: createdBy
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /campus/activities/:id
router.put('/activities/:id', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;
        const { category, title, date, location, soulsWon, contactsCollected, notes } = req.body;

        const { data, error } = await supabase
            .from('campus_activities')
            .update({
                category,
                title,
                date,
                location,
                souls_won: soulsWon,
                contacts_collected: contactsCollected,
                notes,
            })
            .eq('id', id)
            .eq('manifest_id', manifestId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


// DELETE /campus/activities/:id
router.delete('/activities/:id', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;

        const { error } = await supabase
            .from('campus_activities')
            .delete()
            .eq('manifest_id', manifestId)
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Activity deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /campus/attendants/:activityId
router.get('/attendants/:activityId', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { activityId } = req.params;

        const { data, error } = await supabase
            .from('campus_activity_attendants')
            .select('*')
            .eq('manifest_id', manifestId)
            .eq('activity_id', activityId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /campus/attendants
router.post('/attendants', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { activityId, name, contact, residence, isStudent, institutionName, course, createdBy } = req.body;

        const { data, error } = await supabase
            .from('campus_activity_attendants')
            .insert([{
                manifest_id: manifestId,
                activity_id: activityId,
                name,
                contact,
                residence,
                is_student: isStudent,
                institution_name: institutionName,
                course,
                created_by: createdBy
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /campus/attendants/:id
router.delete('/attendants/:id', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;

        const { error } = await supabase
            .from('campus_activity_attendants')
            .delete()
            .eq('manifest_id', manifestId)
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Attendant deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /campus/finance
router.get('/finance', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('campus_finance_records')
            .select('*')
            .eq('manifest_id', manifestId)
            .order('date', { ascending: false });

        if (error) throw error;
        res.json(data.map((d: any) => ({
            ...d,
            recordedBy: d.recorded_by
        })));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /campus/finance
router.post('/finance', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { type, category, amount, description, date, method, recordedBy } = req.body;

        const { data, error } = await supabase
            .from('campus_finance_records')
            .insert([{
                manifest_id: manifestId,
                type,
                category,
                amount,
                description,
                date,
                method,
                recorded_by: recordedBy
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({
            ...data,
            recordedBy: data.recorded_by
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /campus/finance/:id
router.put('/finance/:id', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;
        const { type, category, amount, description, date, method, recordedBy } = req.body;

        const { data, error } = await supabase
            .from('campus_finance_records')
            .update({
                type,
                category,
                amount,
                description,
                date,
                method,
                recorded_by: recordedBy
            })
            .eq('id', id)
            .eq('manifest_id', manifestId)
            .select()
            .single();

        if (error) throw error;
        res.json({
            ...data,
            recordedBy: data.recorded_by
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /campus/finance/:id
router.delete('/finance/:id', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;

        const { error } = await supabase
            .from('campus_finance_records')
            .delete()
            .eq('id', id)
            .eq('manifest_id', manifestId);

        if (error) throw error;
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
