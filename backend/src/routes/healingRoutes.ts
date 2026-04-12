import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

// 1. Create a new Healing Outreach Report
// POST /healing/reports
router.post('/reports', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { date, hospital_name, labourers_count, souls_count, people_reached, notes, captured_by, testimonies, souls } = req.body;
        console.log('Received Healing Report Payload:', JSON.stringify(req.body, null, 2));

        // A. Insert Report
        const { data: report, error: reportError } = await supabase
            .from('healing_reports')
            .insert([{
                manifest_id: manifestId, // INJECT TENANT ID
                date,
                hospital_name,
                labourers_count,
                souls_count,
                people_reached: req.body.people_reached || 0,
                notes,
                created_by: captured_by
            }])
            .select()
            .single();

        if (reportError) throw reportError;

        const reportId = report.id;

        // B. Insert Testimonies (if any)
        if (testimonies && testimonies.length > 0) {
            const testimoniesToInsert = testimonies.map((t: any) => ({
                manifest_id: manifestId,
                report_id: reportId,
                content: t.content,
                testifier_name: t.testifier_name || null,
                testifier_contact: t.testifier_contact || null
            }));

            console.log('Inserting testimonies:', JSON.stringify(testimoniesToInsert, null, 2));
            const { error: testimonyError } = await supabase
                .from('healing_testimonies')
                .insert(testimoniesToInsert);

            if (testimonyError) {
                console.error('Testimony insert error:', JSON.stringify(testimonyError));
                // Don't fail the whole report — return partial success with error detail
                return res.status(201).json({ ...report, _testimonyError: testimonyError.message });
            }
        }

        // C. Insert Souls (if any)
        if (souls && souls.length > 0) {
            const soulsToInsert = souls.map((s: any) => ({
                    manifest_id: manifestId,
                    first_name: s.firstName,
                    last_name: s.lastName,
                    phone: s.phone || null,
                    gender: s.gender,
                    source_type: 'Healing Dept',
                    source_id: reportId,
                    captured_by: captured_by,
                    notes: `Healing Outreach: ${hospital_name}`,
                    residence: s.residence || null,
                    next_of_kin_name: s.nextOfKinName || null,
                    next_of_kin_contact: s.nextOfKinContact || null,
                    status: 'New',
                    event_id: null   // Healing souls are not event-linked (requires migration 57)
                }));

            console.log('Inserting souls:', JSON.stringify(soulsToInsert, null, 2));
            const { error: soulsError } = await supabase
                .from('souls')
                .insert(soulsToInsert);

            if (soulsError) {
                console.error('Souls insert error:', JSON.stringify(soulsError));
                return res.status(201).json({ ...report, _soulsError: soulsError.message });
            }
        }

        res.status(201).json(report);
    } catch (error: any) {
        console.error('Error creating healing report:', error);
        res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
});

// 2. Get All Healing Reports
// GET /healing/reports
router.get('/reports', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('healing_reports')
            .select(`
                *,
                healing_testimonies (*)
            `)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .order('date', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// 2.5 Update Healing Report
// PUT /healing/reports/:id
router.put('/reports/:id', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;
        const { date, hospital_name, labourers_count, souls_count, notes, people_reached, souls, testimonies, captured_by } = req.body;

        // A. Update the report core fields
        const { data, error } = await supabase
            .from('healing_reports')
            .update({ date, hospital_name, labourers_count, souls_count, notes, people_reached })
            .eq('manifest_id', manifestId)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // B. Insert NEW souls added during edit (if any)
        if (souls && souls.length > 0) {
            const soulsToInsert = souls.map((s: any) => ({
                manifest_id: manifestId,
                first_name: s.firstName,
                last_name: s.lastName,
                phone: s.phone || null,
                gender: s.gender,
                source_type: 'Healing Dept',
                source_id: id,
                captured_by: captured_by || null,
                notes: `Healing Outreach: ${hospital_name}`,
                residence: s.residence || null,
                next_of_kin_name: s.nextOfKinName || null,
                next_of_kin_contact: s.nextOfKinContact || null,
                status: 'New',
                event_id: null
            }));
            const { error: soulsError } = await supabase.from('souls').insert(soulsToInsert);
            if (soulsError) console.error('Edit - souls insert error:', soulsError.message);
        }

        // C. Insert NEW testimonies added during edit (if any)
        if (testimonies && testimonies.length > 0) {
            const testimoniesToInsert = testimonies.map((t: any) => ({
                manifest_id: manifestId,
                report_id: id,
                content: t.content,
                testifier_name: t.testifier_name || null,
                testifier_contact: t.testifier_contact || null
            }));
            const { error: testimonyError } = await supabase.from('healing_testimonies').insert(testimoniesToInsert);
            if (testimonyError) console.error('Edit - testimonies insert error:', testimonyError.message);
        }

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
});

// 2.6 Delete Healing Report
// DELETE /healing/reports/:id
router.delete('/reports/:id', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;

        // 1. Delete linked testimonies first
        const { error: testimonyError } = await supabase
            .from('healing_testimonies')
            .delete()
            .eq('report_id', id);
        if (testimonyError) throw testimonyError;

        // 2. Delete linked souls
        const { error: soulsError } = await supabase
            .from('souls')
            .delete()
            .eq('source_type', 'Healing Dept')
            .eq('source_id', id);
        if (soulsError) throw soulsError;

        // 3. Delete the report itself
        const { error } = await supabase
            .from('healing_reports')
            .delete()
            .eq('manifest_id', manifestId)
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Report and linked records deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'An internal server error occurred.' });
    }
});

// 3. Get All Healing Souls
// GET /healing/souls
router.get('/souls', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('souls')
            .select('*')
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('source_type', 'Healing Dept')
            // .ilike('notes', '%Healing%') // No longer needed as source_type is explicit
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// 4. Get All Testimonies
// GET /healing/testimonies
router.get('/testimonies', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('healing_testimonies')
            .select(`
                *,
                healing_reports (hospital_name, date)
            `)
            .eq('manifest_id', manifestId) // Tenant Isolation
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});
// 5. Update Testimony
// PUT /healing/testimonies/:id
router.put('/testimonies/:id', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;
        const { content, testifier_name, testifier_contact } = req.body;

        const { data, error } = await supabase
            .from('healing_testimonies')
            .update({ content, testifier_name, testifier_contact })
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// 6. Delete Testimony
// DELETE /healing/testimonies/:id
router.delete('/testimonies/:id', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;

        const { error } = await supabase
            .from('healing_testimonies')
            .delete()
            .eq('manifest_id', manifestId) // Tenant Isolation
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Testimony deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// GET /healing/stats
router.get('/stats', async (req, res) => {
    try {
        const manifestId = (req as any).manifestId;
        if (!manifestId) return res.status(401).json({ error: 'Unauthorized' });

        // Total Reports
        const { count: reportCount, error: err1 } = await supabase
            .from('healing_reports')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId); // Tenant Isolation

        // Total Testimonies
        const { count: testimonyCount, error: err2 } = await supabase
            .from('healing_testimonies')
            .select('*', { count: 'exact', head: true })
            .eq('manifest_id', manifestId); // Tenant Isolation

        // Total Souls (Sum of souls_count column)
        const { data: soulsData, error: err3 } = await supabase
            .from('healing_reports')
            .select('souls_count')
            .eq('manifest_id', manifestId); // Tenant Isolation

        const totalSouls = soulsData ? soulsData.reduce((acc, curr) => acc + (curr.souls_count || 0), 0) : 0;

        res.json({
            totalReports: reportCount || 0,
            totalTestimonies: testimonyCount || 0,
            totalSouls
        });

    } catch (error: any) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

export default router;
