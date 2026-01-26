import { Router } from 'express';
import {
    getAllRequisitions,
    getRequisitionsByDepartment,
    createRequisition,
    updateRequisition,
    updateStatus,
    addPayment
} from '../controllers/requisitionController';

const router = Router();

router.get('/', getAllRequisitions);
router.get('/department/:deptId', getRequisitionsByDepartment);
router.post('/', createRequisition);
router.put('/:id', updateRequisition);
router.patch('/:id/status', updateStatus);
router.post('/:id/payment', addPayment);

export default router;
