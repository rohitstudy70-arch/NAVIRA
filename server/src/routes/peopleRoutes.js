import { Router } from 'express';
import { createPerson, deletePerson, listPeople, updatePerson } from '../controllers/peopleController.js';
import { protect, allow, adminRoles } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/:type(students|staff)', listPeople);
router.post('/:type(students|staff)', allow(...adminRoles), createPerson);
router.patch('/:type(students|staff)/:id', allow(...adminRoles, 'teacher'), updatePerson);
router.delete('/:type(students|staff)/:id', allow(...adminRoles), deletePerson);
export default router;
