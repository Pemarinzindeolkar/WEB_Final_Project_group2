import express from 'express';
const router = express.Router();

// Import controllers
import {
  registerStudent,
  getAvailableSeats,
  bookSeat,
  getMyBookings,
  cancelBooking
} from '../controllers/studentController.js';

// Routes
router.post('/register', registerStudent);
router.get('/seats/available', getAvailableSeats);
router.post('/book', bookSeat);
router.get('/my-bookings/:studentId', getMyBookings);
router.delete('/booking/:bookingId', cancelBooking);

export default router;
