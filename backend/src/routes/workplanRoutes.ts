import { Router } from 'express';
import {
    getWorkplansByDepartment,
    createWorkplan,
    updateWorkplan,
    deleteWorkplan,
} from '../controllers/workplanController';

const router = Router();

router.get( '/department/:departmentId',  getWorkplansByDepartment);
router.post('/',                          createWorkplan);
router.patch('/:workplanId',              updateWorkplan);
router.delete('/:workplanId',             deleteWorkplan);

export default router;
