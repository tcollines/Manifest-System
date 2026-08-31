import { Router } from 'express';
import { adminCouncilAuth } from '../middleware/adminCouncilAuth';
import {
    adminLogin,
    getOverview,
    getAllManifests,
    getManifestById,
    createManifest,
    updateManifest,
    getManifestUsers,
} from '../controllers/adminCouncilController';

const router = Router();

// ─── Public (no auth) ─────────────────────────────────────────────────────────
router.post('/auth/login', adminLogin);

// ─── Protected (Admin Council members only) ───────────────────────────────────
router.use(adminCouncilAuth);

router.get('/overview', getOverview);
router.get('/manifests', getAllManifests);
router.post('/manifests', createManifest);
router.get('/manifests/:id', getManifestById);
router.put('/manifests/:id', updateManifest);
router.get('/manifests/:id/users', getManifestUsers);

export default router;
