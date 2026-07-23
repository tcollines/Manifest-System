import { Router } from 'express';
import { getAllUsers, createUser, updateUser, deleteUser, getProfile, getUserByEmail } from '../controllers/userController';

const router = Router();

router.get('/by-email', getUserByEmail);
router.get('/profile', getProfile);
router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
