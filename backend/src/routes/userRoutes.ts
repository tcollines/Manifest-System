import { Router } from 'express';
import { getAllUsers, createUser, updateUser, deleteUser, getProfile, syncManifestClaim } from '../controllers/userController';

const router = Router();

router.get('/profile', getProfile);
router.post('/sync-manifest', syncManifestClaim);
router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
