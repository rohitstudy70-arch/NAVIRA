import { Router } from 'express';
import { correctAttendance, dashboard, kioskInfo, listAttendance } from '../controllers/attendanceController.js';
import { scanCard } from '../controllers/scanController.js';
import { protect, allow } from '../middleware/auth.js';

const router = Router();
router.post('/scan', scanCard); // Device API-key authenticated separately.
router.get('/kiosk-info', kioskInfo); // Public lightweight info for tablet kiosk reader
router.use(protect);
router.get('/dashboard', dashboard);
router.get('/', listAttendance);
router.patch('/:id/correct', allow('super_admin', 'school_admin', 'principal', 'teacher'), correctAttendance);
export default router;
