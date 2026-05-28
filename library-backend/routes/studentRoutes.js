/**
 * STUDENT ROUTES
 * Base path: /api/student
 */

import express from 'express';
const router = express.Router();

// Import controller functions
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

// ============ AUTHENTICATION ROUTES ============
router.post('/signup', signupStudent);           // Create new account
router.post('/login', loginStudent);             // Login existing student
router.post('/forgot-password', forgotPassword); // Request password reset
router.post('/reset-password', resetPassword);   // Reset password with token

// ============ PREFERENCES ROUTES ============
router.get('/preferences/:student_id', getStudentPreferences);     // Get saved preferences
router.put('/preferences/:student_id', updatePreferences);         // Update preferences (favorite seat, etc.)
router.get('/favorite-seat/:student_id', getFavoriteSeat);          // Get favorite seat if available

// ============ BOOKING ROUTES ============
router.get('/seats/available', getAvailableSeats);                              // View available seats
router.post('/book', bookSeat);                                                 // Book a seat
router.get('/my-bookings/:studentId', getMyBookings);                           // View all bookings
router.get('/my-bookings-filtered/:studentId', getMyBookingsWithFilters);       // View filtered bookings
router.delete('/booking/:bookingId', cancelBooking);                            // Cancel a booking

export default router;