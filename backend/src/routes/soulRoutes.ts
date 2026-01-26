import { Router } from 'express';
import {
    getSouls,
    addSoul,
    updateSoul,
    deleteSoul,
    getSoulServiceStats,
    getNextGenSouls,
    addNextGenSoul,
    deleteNextGenSoul,
    getNextGenSoulCount
} from '../controllers/soulController';

const router = Router();

// General Souls
router.get('/', getSouls);
router.post('/', addSoul);
router.put('/:id', updateSoul);
router.delete('/:id', deleteSoul);
router.get('/stats/:serviceId', getSoulServiceStats);

// Next Gen Souls
router.get('/nextgen', getNextGenSouls);
router.post('/nextgen', addNextGenSoul);
router.delete('/nextgen/:id', deleteNextGenSoul);
router.get('/nextgen/count/:serviceId', getNextGenSoulCount);

export default router;
