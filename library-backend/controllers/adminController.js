// Import database connection utility and bcryptjs for password hashing
import { getDb } from '../database.js';
import bcrypt from 'bcryptjs';

/**
 * ADMIN LOGIN
 * 
 * Authenticates an administrator using username and password.
 * Compares the provided password with the stored hash using bcrypt.
 * 
 * @route POST /api/admin/login
 * @param {Object} req - Express request object containing username and password in body
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status and admin info (excluding password hash)
 */
export async function adminLogin(req, res) {
  try {
    // Extract login credentials from request body
    const { username, password } = req.body;
    
    // Get database connection pool
    const pool = await getDb();
    
    // Query the database for admin with matching username
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );
    
    // If no admin found with this username, return unauthorized error
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Get the admin record from query result
    const admin = result.rows[0];
    
    // Compare the provided password with the stored hash using bcrypt
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    
    // If password doesn't match, return unauthorized error
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Return success response with admin info (exclude password_hash)
    res.json({
      success: true,
      message: 'Login successful',
      admin: {
        username: admin.username,
        full_name: admin.full_name
      }
    });
  } catch (error) {
    // Handle any server errors
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET ALL SEATS (ADMIN VIEW)
 * 
 * Retrieves all 200 seats with their current booking status.
 * Left joins with bookings table to show booking details if seat is booked.
 * 
 * @route GET /api/admin/seats
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} Array of seat objects with booking information where applicable
 */
export async function getAllSeats(req, res) {
  try {
    // Get database connection pool
    const pool = await getDb();
    
    // Query to fetch all seats with their associated booking information
    // LEFT JOIN ensures we get all seats even if no booking exists
    // Only includes non-cancelled bookings
    const result = await pool.query(
      `SELECT s.*, 
        b.id as booking_id, 
        b.student_id, 
        b.student_name,
        b.booking_time,
        b.booking_date,
        b.expires_at,
        b.verified
       FROM seats s
       LEFT JOIN bookings b ON s.id = b.seat_id 
        AND b.cancelled = false
       ORDER BY s.floor_number, s.table_number, s.seat_number`
    );
    
    // Return all seat records as JSON array
    res.json(result.rows);
  } catch (error) {
    // Handle any server errors
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET ALL BOOKINGS
 * 
 * Retrieves all booking records across all students.
 * Joins with seats table to include seat location details.
 * Orders by booking date (most recent first) and limits to 100 records.
 * 
 * @route GET /api/admin/bookings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} Array of booking objects with seat details
 */
export async function getAllBookings(req, res) {
  try {
    // Get database connection pool
    const pool = await getDb();
    
    // Query to fetch all bookings with their associated seat information
    // ORDER BY booking_date DESC shows most recent bookings first
    // LIMIT 100 prevents overwhelming response with too many records
    const result = await pool.query(
      `SELECT b.*, s.floor_number, s.table_number, s.seat_number, s.seat_label 
       FROM bookings b
       JOIN seats s ON b.seat_id = s.id
       ORDER BY b.booking_date DESC, b.booking_time DESC
       LIMIT 100`
    );
    
    // Return all booking records as JSON array
    res.json(result.rows);
  } catch (error) {
    // Handle any server errors
    res.status(500).json({ error: error.message });
  }
}

/**
 * VERIFY BOOKING (ADMIN ACTION)
 * 
 * Marks a pending booking as verified (confirmed by admin).
 * Only applies to future bookings that are not auto-verified.
 * Updates the booking with admin name and verification timestamp.
 * 
 * @route PUT /api/admin/verify/:bookingId
 * @param {Object} req - Express request object with bookingId parameter
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status
 */
export async function verifyBooking(req, res) {
  try {
    // Extract booking ID from URL parameter
    const { bookingId } = req.params;
    // Extract admin name from request body
    const { admin_name } = req.body;
    
    // Get database connection pool
    const pool = await getDb();
    
    // Check if booking exists, is not verified, and is not cancelled
    const booking = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND verified = false AND cancelled = false`,
      [bookingId]
    );
    
    // If booking not found or already verified/cancelled, return error
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or already verified' });
    }
    
    // Update booking: set verified to true, record who verified it and when
    await pool.query(
      `UPDATE bookings 
       SET verified = true, 
           verified_by = $1,
           verified_at = NOW()
       WHERE id = $2`,
      [admin_name || 'admin', bookingId]
    );
    
    // Return success response
    res.json({
      success: true,
      message: 'Booking verified successfully'
    });
  } catch (error) {
    // Handle any server errors
    res.status(500).json({ error: error.message });
  }
}

/**
 * REMOVE BOOKING (ADMIN ACTION)
 * 
 * Cancels a booking and releases the associated seat.
 * Admin can remove any booking regardless of status.
 * The seat becomes available for other students to book.
 * 
 * @route DELETE /api/admin/booking/:bookingId
 * @param {Object} req - Express request object with bookingId parameter
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status
 */
export async function removeBooking(req, res) {
  try {
    // Extract booking ID from URL parameter
    const { bookingId } = req.params;
    
    // Get database connection pool
    const pool = await getDb();
    
    // Get the seat_id associated with this booking before updating
    const booking = await pool.query(
      'SELECT seat_id FROM bookings WHERE id = $1',
      [bookingId]
    );
    
    // If booking not found, return error
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Mark the booking as cancelled with admin metadata
    await pool.query(
      `UPDATE bookings 
       SET cancelled = true, 
           cancelled_by = 'admin',
           cancelled_at = NOW(),
           cancellation_reason = 'Removed by admin'
       WHERE id = $1`,
      [bookingId]
    );
    
    // Release the seat by changing its status back to 'available'
    await pool.query(
      'UPDATE seats SET status = $1 WHERE id = $2',
      ['available', booking.rows[0].seat_id]
    );
    
    // Return success response
    res.json({
      success: true,
      message: 'Booking removed successfully'
    });
  } catch (error) {
    // Handle any server errors
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET SYSTEM STATISTICS
 * 
 * Retrieves summary statistics about the library system.
 * Used for admin dashboard to display key metrics.
 * 
 * @route GET /api/admin/statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON object with all statistics
 * @returns {number} total_seats - Total number of seats (should always be 200)
 * @returns {number} available_seats - Number of seats currently available
 * @returns {number} booked_seats - Number of seats currently booked
 * @returns {number} active_bookings - Number of pending (unverified) bookings
 * @returns {number} total_students - Total number of registered students
 */
export async function getStatistics(req, res) {
  try {
    // Get database connection pool
    const pool = await getDb();
    
    // Count total seats in the library (should be 200)
    const totalSeats = await pool.query('SELECT COUNT(*) as count FROM seats');
    
    // Count seats that are currently available for booking
    const availableSeats = await pool.query("SELECT COUNT(*) as count FROM seats WHERE status = 'available'");
    
    // Count seats that are currently booked (verified or unverified)
    const bookedSeats = await pool.query("SELECT COUNT(*) as count FROM seats WHERE status = 'booked'");
    
    // Count bookings that are pending verification (unverified and not cancelled)
    const activeBookings = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE verified = false AND cancelled = false"
    );
    
    // Count total number of registered students
    const totalStudents = await pool.query('SELECT COUNT(*) as count FROM students');
    
    // Return all statistics as a single JSON object
    // parseInt converts the string count to a number
    res.json({
      total_seats: parseInt(totalSeats.rows[0].count),
      available_seats: parseInt(availableSeats.rows[0].count),
      booked_seats: parseInt(bookedSeats.rows[0].count),
      active_bookings: parseInt(activeBookings.rows[0].count),
      total_students: parseInt(totalStudents.rows[0].count)
    });
  } catch (error) {
    // Handle any server errors
    res.status(500).json({ error: error.message });
  }
}