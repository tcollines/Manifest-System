
import express from 'express';
import { getServiceAttendance, getSoulsWon } from '../controllers/analyticsController';

const router = express.Router();

router.get('/attendance', getServiceAttendance);
router.get('/souls', getSoulsWon);

export default router;
