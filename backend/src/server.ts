import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// [SECURITY] Startup env validation — no credentials logged
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_KEY) {
    console.error('[FATAL] Missing required environment variables. Server will not start.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Required for rate-limiting to work dynamically behind Nginx/ALB
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

import { authenticate } from './middleware/auth';
import authRoutes from './routes/authRoutes';
import publicRoutes from './routes/publicRoutes'; // NEW public routes

// Public endpoints
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);

// Protected endpoints
// Public Health & Root Routes
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is healthy' });
});

app.get('/', (req, res) => {
    res.send('Manifest System API is running. Access endpoints at /api/...');
});

// [SECURITY] /api/admin/sql endpoint permanently removed — P0 vulnerability
// Any previous functionality this provided must be performed via Supabase Dashboard only.

// Protect all /api routes below this line
app.use('/api', authenticate);

import userRoutes from './routes/userRoutes';
import eventRoutes from './routes/eventRoutes';
import memberRoutes from './routes/memberRoutes';
import requisitionRoutes from './routes/requisitionRoutes';
import financeRoutes from './routes/financeRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import childRoutes from './routes/childRoutes';
import schoolRoutes from './routes/schoolRoutes';
import soulRoutes from './routes/soulRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import assetRoutes from './routes/assetRoutes';
import logisticsRoutes from './routes/logisticsRoutes';
import parkingRoutes from './routes/parkingRoutes';
import manifestRoutes from './routes/manifestRoutes';
import healingRoutes from './routes/healingRoutes';
import reportRoutes from './routes/reportRoutes';
import departmentRoutes from './routes/departmentRoutes';
import campusRoutes from './routes/campusRoutes';
import residentRoutes from './routes/residentRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import workplanRoutes from './routes/workplanRoutes';
// pg Client import removed — was only used by the deleted /api/admin/sql endpoint

app.use('/api/users', userRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reports', reportRoutes); // Register report routes
app.use('/api/requisitions', requisitionRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/souls', soulRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/children', childRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/manifest', manifestRoutes);
app.use('/api/healing', healingRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/campus', campusRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/workplans', workplanRoutes);


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


