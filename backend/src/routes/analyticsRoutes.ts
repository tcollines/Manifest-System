
import express from 'express';
import { getServiceAttendance, getSoulsWon, getDashboardKPIs, getFollowUpAnalysis } from '../controllers/analyticsController';

const router = express.Router();

router.get('/attendance', getServiceAttendance);
router.get('/souls', getSoulsWon);
router.get('/dashboard', getDashboardKPIs);
router.get('/followup', getFollowUpAnalysis);

export default router;
