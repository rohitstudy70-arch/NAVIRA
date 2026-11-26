import { Router } from 'express';
import { createDevice, createResource, getAuditLogs, getSettings, listDevices, listResource, updateDevice, updateResource, updateSettings } from '../controllers/resourceController.js';
import { protect, allow, adminRoles } from '../middleware/auth.js';
import { createUser, listUsers, updateUser } from '../controllers/userController.js';

const router = Router();
router.use(protect);
router.get('/classes', listResource); router.post('/classes', allow(...adminRoles), createResource); router.patch('/classes/:id', allow(...adminRoles), updateResource);
router.get('/holidays', listResource); router.post('/holidays', allow(...adminRoles), createResource); router.patch('/holidays/:id', allow(...adminRoles), updateResource);
router.get('/leaves', listResource); router.post('/leaves', createResource); router.patch('/leaves/:id', allow(...adminRoles, 'teacher'), updateResource);
router.get('/devices', allow(...adminRoles), listDevices); router.post('/devices', allow('super_admin'), createDevice); router.patch('/devices/:id', allow('super_admin'), updateDevice);
router.get('/settings', allow(...adminRoles), getSettings); router.patch('/settings', allow('super_admin'), updateSettings);
router.get('/audit-logs', allow('super_admin'), getAuditLogs);
router.get('/users', allow('super_admin'), listUsers); router.post('/users', allow('super_admin'), createUser); router.patch('/users/:id', allow('super_admin'), updateUser);
export default router;
