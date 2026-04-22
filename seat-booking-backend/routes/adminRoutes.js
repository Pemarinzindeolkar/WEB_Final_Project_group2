import express from 'express';
import { adminLogin, getAllSeats, removeBooking, resetSeat, getStatistics } from '../controllers/adminController.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', adminLogin);
router.get('/seats', adminAuth, getAllSeats);
router.delete('/booking/:seatId', adminAuth, removeBooking);
router.post('/reset/:seatId', adminAuth, resetSeat);
router.get('/statistics', adminAuth, getStatistics);

export default router;