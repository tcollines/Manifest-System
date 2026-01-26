import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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







// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Root Route
app.get('/', (req, res) => {
    res.send('Manifest System API is running. Access endpoints at /api/...');
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
