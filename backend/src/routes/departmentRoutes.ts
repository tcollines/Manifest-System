import express from 'express';
import { getDepartments } from '../controllers/departmentController';

const router = express.Router();

router.get('/', getDepartments);

export default router;
