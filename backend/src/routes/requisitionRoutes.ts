import { Router } from 'express';
import {
    getAllRequisitions,
    getRequisitionsByDepartment,
    createRequisition,
    updateRequisition,
    updateStatus,
    addPayment,
    createBatch,
    getBatches,
    updateBatchStatus,
    getQueue
} from '../controllers/requisitionController';

const router = Router();

router.get('/batches', getBatches);
router.patch('/batches/:batchId/status', updateBatchStatus);

router.get('/queue', getQueue);
router.get('/', getAllRequisitions);
router.get('/department/:deptId', getRequisitionsByDepartment);
router.post('/', createRequisition);
router.post('/batch', createBatch); // Handle bulk generation of batch_id mapping
router.put('/:id', updateRequisition);
router.patch('/:id/status', updateStatus);
router.post('/:id/payment', addPayment);

export default router;
