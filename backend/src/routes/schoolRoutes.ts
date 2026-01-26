import { Router } from 'express';
import { getSchoolReports, addSchoolReport } from '../controllers/schoolController';

const router = Router();

router.get('/reports', getSchoolReports);
router.post('/reports', addSchoolReport);

export default router;
