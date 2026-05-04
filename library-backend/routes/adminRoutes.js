import express from 'express';
const router = express.Router();

import {
  adminLogin,
  getAllSeats,
  getAllBookings,
  verifyBooking,
  removeBooking,
  getStatistics
} from '../controllers/adminController.js';

router.post('/login', adminLogin);
router.get('/seats', getAllSeats);
router.get('/bookings', getAllBookings);
router.put('/verify/:bookingId', verifyBooking);
router.delete('/booking/:bookingId', removeBooking);
router.get('/statistics', getStatistics);

export default router;
