import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

// 1. Create a new Healing Outreach Report
// POST /healing/reports
router.post('/reports', async (req, res) => {
    try {
        const { date, hospital_name, labourers_count, souls_count, notes, captured_by, testimonies, souls } = req.body;

        // A. Insert Report
        const { data: report, error: reportError } = await supabase
            .from('healing_reports')
            .insert([{
                date,
                hospital_name,
                labourers_count,
                souls_count,
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
                report_id: reportId,
                content: t.content,
                testifier_name: t.testifier_name,
                testifier_contact: t.testifier_contact
            }));

            const { error: testimonyError } = await supabase
                .from('healing_testimonies')
                .insert(testimoniesToInsert);

            if (testimonyError) throw testimonyError;
        }

        // C. Insert Souls (if any)
        if (souls && souls.length > 0) {
            const soulsToInsert = souls.map((s: any) => ({
                first_name: s.firstName,
                last_name: s.lastName,
                phone: s.phone,
                gender: s.gender,
                source_type: 'Outreach', // As decided
                source_id: reportId,     // Link to this report
                captured_by: captured_by, // Ensure we track who added them
                notes: `Healing Outreach: ${hospital_name}`
            }));

            const { error: soulsError } = await supabase
                .from('souls') // Linking to MAIN souls table
                .insert(soulsToInsert);

            if (soulsError) throw soulsError;
        }

        res.status(201).json(report);
    } catch (error: any) {
        console.error('Error creating healing report:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Get All Healing Reports
// GET /healing/reports
router.get('/reports', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('healing_reports')
            .select(`
                *,
                healing_testimonies (*)
            `)
            .order('date', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2.5 Update Healing Report
// PUT /healing/reports/:id
router.put('/reports/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { date, hospital_name, labourers_count, souls_count, notes } = req.body;

        const { data, error } = await supabase
            .from('healing_reports')
            .update({ date, hospital_name, labourers_count, souls_count, notes })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2.6 Delete Healing Report
// DELETE /healing/reports/:id
router.delete('/reports/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('healing_reports')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Report deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Get All Healing Souls
// GET /healing/souls
router.get('/souls', async (req, res) => {
    try {
        // Fetch souls linked to healing reports via source_id
        // We use a join or subquery logic. 
        // Supabase simpler approach: Select souls where source_type is 'Outreach' and source_id is in the list of healing report IDs.
        // OR better: Filter by metadata if possible.
        // Let's rely on source_type="Outreach" for now, or fetch all and filter client side if volume is low? 
        // No, let's do server side.

        // Option A: Join not easy on generic souls table without explicit FK setup sometimes.
        // Option B: Query all souls with source_type = 'Outreach' (Assuming only Healing uses this for now or filtering by notes)

        const { data, error } = await supabase
            .from('souls')
            .select('*')
            .eq('source_type', 'Outreach')
            .ilike('notes', '%Healing%') // Extra safety
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Get All Testimonies
// GET /healing/testimonies
router.get('/testimonies', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('healing_testimonies')
            .select(`
                *,
                healing_reports (hospital_name, date)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
// 5. Update Testimony
// PUT /healing/testimonies/:id
router.put('/testimonies/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, testifier_name, testifier_contact } = req.body;

        const { data, error } = await supabase
            .from('healing_testimonies')
            .update({ content, testifier_name, testifier_contact })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Delete Testimony
// DELETE /healing/testimonies/:id
router.delete('/testimonies/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('healing_testimonies')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Testimony deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /healing/stats
router.get('/stats', async (req, res) => {
    try {
        // Example: Get total souls won via Healing Dept, etc.
        // For now, simpler to just aggregate on frontend or do a quick query.

        // Total Reports
        const { count: reportCount, error: err1 } = await supabase
            .from('healing_reports')
            .select('*', { count: 'exact', head: true });

        // Total Testimonies
        const { count: testimonyCount, error: err2 } = await supabase
            .from('healing_testimonies')
            .select('*', { count: 'exact', head: true });

        // Total Souls (Sum of souls_count column)
        // Note: 'sum' is not directly supported via postgrest js client easily without .rpc() or client-side reduction.
        // We can do a quick select of the column.
        const { data: soulsData, error: err3 } = await supabase
            .from('healing_reports')
            .select('souls_count');

        const totalSouls = soulsData ? soulsData.reduce((acc, curr) => acc + (curr.souls_count || 0), 0) : 0;

        res.json({
            totalReports: reportCount || 0,
            totalTestimonies: testimonyCount || 0,
            totalSouls
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
