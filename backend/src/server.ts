import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

import userRoutes from './routes/userRoutes';
import eventRoutes from './routes/eventRoutes';
import memberRoutes from './routes/memberRoutes';
import requisitionRoutes from './routes/requisitionRoutes';
import financeRoutes from './routes/financeRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import childRoutes from './routes/childRoutes';
import schoolRoutes from './routes/schoolRoutes';
import soulRoutes from './routes/soulRoutes';
import assetRoutes from './routes/assetRoutes';
import logisticsRoutes from './routes/logisticsRoutes';
import parkingRoutes from './routes/parkingRoutes';
import manifestRoutes from './routes/manifestRoutes';
import healingRoutes from './routes/healingRoutes';
import reportRoutes from './routes/reportRoutes';
import departmentRoutes from './routes/departmentRoutes';

app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/requisitions', requisitionRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/children', childRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/souls', soulRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/manifest', manifestRoutes);
app.use('/api/healing', healingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/departments', departmentRoutes);







// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Root Route
app.get('/', (req, res) => {
    res.send('Manifest System API is running. Access endpoints at /api/...');
});


app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    // 1. Startup Self-Check: Database Connectivity & Permissions
    try {
        const { supabase } = require('./supabase');
        console.log("Verifying Database Connection...");
        const { data, error } = await supabase.from('members').select('id').limit(1).maybeSingle();

        if (error) {
            console.error("❌ CRITICAL: Database Self-Check Failed!");
            console.error("Error details:", error);
            console.error("This indicates a permission issue (RLS) or connection failure.");
            console.error("The server will shut down to prevent serving invalid states.");
            process.exit(1);
        }
        console.log("✅ Database Connection Verified (Service Role Active).");
    } catch (e) {
        console.error("❌ CRITICAL: Startup Error during Self-Check:", e);
        process.exit(1);
    }

    // Automatic User Cleanup for Closed Events (Every 1 hour)
    setInterval(async () => {
        try {
            console.log("Running automatic event user cleanup...");
            const { cleanupPastEvents } = require('./controllers/eventController');
            await cleanupPastEvents();
        } catch (e) {
            console.error("Auto-cleanup failed:", e);
        }
    }, 60 * 60 * 1000); // 1 hour
});


