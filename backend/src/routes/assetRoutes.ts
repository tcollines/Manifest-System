import { Router } from 'express';
import {
    getAllAssets,
    getAssetsByDepartment,
    addAsset,
    updateAsset,
    deleteAsset
} from '../controllers/assetController';

const router = Router();

router.get('/', getAllAssets);
router.get('/department/:departmentId', getAssetsByDepartment);
router.post('/', addAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

export default router;
