/**
 * ADMIN ROUTES
 * 
 * Defines all API endpoints for administrator operations.
 * Base path: /api/admin
 * 
 * All routes are currently public for demo purposes.
 * In production, add authentication middleware to protect these routes.
 */

import express from 'express';
const router = express.Router();

// Import controller functions for admin operations
import {
  adminLogin,
  getAllSeats,
  getAllBookings,
  verifyBooking,
  removeBooking,
  getStatistics
} from '../controllers/adminController.js';

/**
 * ADMIN LOGIN
 * Authenticates an administrator using username and password
 * 
 * @route POST /api/admin/login
 * @body {string} username - Admin username
 * @body {string} password - Admin password
 * @returns {Object} Success status and admin info (excluding password)
 */
router.post('/login', adminLogin);

/**
 * GET ALL SEATS
 * Retrieves all 200 seats with current booking status
 * Used for admin dashboard to monitor all seats
 * 
 * @route GET /api/admin/seats
 * @returns {Array} List of all seats with booking details where applicable
 */
router.get('/seats', getAllSeats);

/**
 * GET ALL BOOKINGS
 * Retrieves all booking records across all students
 * Limited to last 100 bookings for performance
 * 
 * @route GET /api/admin/bookings
 * @returns {Array} List of all bookings with seat details
 */
router.get('/bookings', getAllBookings);

/**
 * VERIFY BOOKING
 * Marks a pending future booking as verified by admin
 * This confirms the student has arrived
 * 
 * @route PUT /api/admin/verify/:bookingId
 * @param {number} bookingId - ID of the booking to verify
 * @body {string} admin_name - Name of admin performing verification
 * @returns {Object} Success status and message
 */
router.put('/verify/:bookingId', verifyBooking);

/**
 * REMOVE BOOKING
 * Cancels any booking and releases the seat
 * Admin can remove bookings regardless of status
 * 
 * @route DELETE /api/admin/booking/:bookingId
 * @param {number} bookingId - ID of the booking to remove
 * @returns {Object} Success status and message
 */
router.delete('/booking/:bookingId', removeBooking);

/**
 * GET SYSTEM STATISTICS
 * Returns summary statistics for admin dashboard
 * Includes seat counts, booking counts, and student counts
 * 
 * @route GET /api/admin/statistics
 * @returns {Object} System statistics (total seats, available, booked, etc.)
 */
router.get('/statistics', getStatistics);

export default router;