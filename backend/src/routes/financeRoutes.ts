import { Router } from 'express';
import { getTransactions, addTransaction, getRequests, updateRequest, getFinanceSummary } from '../controllers/financeController';

const router = Router();
router.get('/summary', getFinanceSummary);
router.get('/transactions', getTransactions);
router.post('/transactions', addTransaction);
router.get('/requests', getRequests);
router.patch('/requests/:id', updateRequest);

export default router;
