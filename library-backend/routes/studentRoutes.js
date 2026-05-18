import express from 'express';
const router = express.Router();

import {
  signupStudent,
  loginStudent,
  forgotPassword,
  resetPassword,
  getStudentPreferences,
  updatePreferences,
  getFavoriteSeat,
  getAvailableSeats,
  bookSeat,
  getMyBookings,
  getMyBookingsWithFilters,
  cancelBooking
} from '../controllers/studentController.js';

// Auth routes
router.post('/signup', signupStudent);
router.post('/login', loginStudent);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Preferences
router.get('/preferences/:student_id', getStudentPreferences);
router.put('/preferences/:student_id', updatePreferences);
router.get('/favorite-seat/:student_id', getFavoriteSeat);

// Booking routes
router.get('/seats/available', getAvailableSeats);
router.post('/book', bookSeat);
router.get('/my-bookings/:studentId', getMyBookings);
router.get('/my-bookings-filtered/:studentId', getMyBookingsWithFilters);
router.delete('/booking/:bookingId', cancelBooking);

export default router;
