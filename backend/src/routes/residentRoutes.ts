import express from 'express';
import {
    getResidences,
    addResidence,
    deleteResidence,
    getResidenceMembers,
    getResidentReports,
    addResidentReport
} from '../controllers/residentController';

const router = express.Router();

router.get('/', getResidences);
router.post('/', addResidence);
router.delete('/:id', deleteResidence);
router.get('/:id/members', getResidenceMembers);

router.get('/reports', getResidentReports);
router.post('/reports', addResidentReport);

export default router;
