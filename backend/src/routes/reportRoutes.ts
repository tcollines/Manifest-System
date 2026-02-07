
import express from 'express';
import {
    getAllReports,
    createReport,
    updateReport,
    getMyReports,
    submitReport,
    deleteReport
} from '../controllers/reportController';

const router = express.Router();

// Admin Routes
router.get('/', getAllReports);
router.post('/', createReport);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

// HoD Routes
router.get('/department/:departmentId', getMyReports);
router.post('/:id/submit', submitReport);

export default router;
