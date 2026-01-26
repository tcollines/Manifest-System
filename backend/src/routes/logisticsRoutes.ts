import { Router } from 'express';
import {
    getStations,
    addStation,
    updateStation,
    deleteStation
} from '../controllers/logisticsController';

const router = Router();

router.get('/stations', getStations);
router.post('/stations', addStation);
router.put('/stations/:id', updateStation);
router.delete('/stations/:id', deleteStation);

export default router;
