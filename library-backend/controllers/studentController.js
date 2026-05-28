/**
 * STUDENT CONTROLLER
 * Handles all student-related operations including authentication, 
 * seat booking, preferences, and booking management.
 */

import { getDb } from '../database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Mock email function for password reset (prints to console)
 * In production, replace with actual email service like nodemailer
 */
async function mockSendResetEmail(to, resetToken, studentName) {
  console.log('\n📧 ========== PASSWORD RESET EMAIL ==========');
  console.log(`To: ${to}`);
  console.log(`Student: ${studentName}`);
  console.log(`Reset Link: http://localhost:3000/reset-password.html?token=${resetToken}`);
  console.log('=============================================\n');
  return true;
}

// ============ AUTHENTICATION ============

/**
 * STUDENT SIGNUP
 * Creates a new student account with hashed password
 * @route POST /api/student/signup
 */
export async function signupStudent(req, res) {
  try {
    const { student_id, full_name, email, phone, password } = req.body;
    
    // Validate required fields
    if (!student_id || !full_name || !password) {
      return res.status(400).json({ error: 'Student ID, Full Name, and Password are required' });
    }
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required for password recovery' });
    }
    
    const pool = await getDb();
    
    // Check if student already exists
    const existing = await pool.query(
      'SELECT * FROM students WHERE student_id = $1',
      [student_id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Student ID already exists. Please login instead.' });
    }
    
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new student
    const result = await pool.query(
      `INSERT INTO students (student_id, full_name, email, phone, password_hash) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, student_id, full_name, email, phone, created_at`,
      [student_id, full_name, email, phone || null, hashedPassword]
    );
    
    // Create default preferences entry
    await pool.query(
      `INSERT INTO student_preferences (student_id, notifications_enabled, email_reminders) 
       VALUES ($1, true, true)`,
      [student_id]
    );
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please login.',
      student: result.rows[0]
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * STUDENT LOGIN
 * Authenticates student using student_id and password
 * @route POST /api/student/login
 */
export async function loginStudent(req, res) {
  try {
    const { student_id, password } = req.body;
    
    if (!student_id || !password) {
      return res.status(400).json({ error: 'Student ID and Password are required' });
    }
    
    const pool = await getDb();
    
    // Find student by ID
    const result = await pool.query(
      'SELECT * FROM students WHERE student_id = $1',
      [student_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid Student ID or Password. Please sign up first.' });
    }
    
    const student = result.rows[0];
    
    if (!student.password_hash) {
      return res.status(401).json({ error: 'Please use "Forgot Password" to set up your password.' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, student.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid Student ID or Password' });
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      student: {
        id: student.id,
        student_id: student.student_id,
        full_name: student.full_name,
        email: student.email,
        phone: student.phone,
        created_at: student.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * FORGOT PASSWORD
 * Generates reset token and sends password reset email
 * @route POST /api/student/forgot-password
 */
export async function forgotPassword(req, res) {
  try {
    const { student_id, email } = req.body;
    const pool = await getDb();
    
    // Verify student exists with matching email
    const student = await pool.query(
      'SELECT * FROM students WHERE student_id = $1 AND email = $2',
      [student_id, email]
    );
    
    if (student.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with these credentials' });
    }
    
    // Generate unique reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour
    
    // Save token to database
    await pool.query(
      `INSERT INTO password_resets (student_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [student_id, resetToken, expiresAt]
    );
    
    // Send reset email
    await mockSendResetEmail(email, resetToken, student.rows[0].full_name);
    
    res.json({
      success: true,
      message: 'Password reset link sent to your email',
      debug_token: resetToken // Remove in production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * RESET PASSWORD
 * Validates token and updates password
 * @route POST /api/student/reset-password
 */
export async function resetPassword(req, res) {
  try {
    const { token, new_password } = req.body;
    const pool = await getDb();
    
    // Find valid, unused token that hasn't expired
    const resetRequest = await pool.query(
      `SELECT * FROM password_resets 
       WHERE token = $1 AND used = false AND expires_at > NOW()`,
      [token]
    );
    
    if (resetRequest.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    // Update student password
    await pool.query(
      'UPDATE students SET password_hash = $1 WHERE student_id = $2',
      [hashedPassword, resetRequest.rows[0].student_id]
    );
    
    // Mark token as used
    await pool.query(
      'UPDATE password_resets SET used = true WHERE token = $1',
      [token]
    );
    
    res.json({ success: true, message: 'Password reset successfully! Please login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message });
  }
}

// ============ SEAT PREFERENCES ============

/**
 * GET STUDENT PREFERENCES
 * Retrieves student's saved preferences including favorite seat
 * @route GET /api/student/preferences/:student_id
 */
export async function getStudentPreferences(req, res) {
  try {
    const { student_id } = req.params;
    const pool = await getDb();
    
    const preferences = await pool.query(
      `SELECT sp.*, s.seat_label, s.floor_number, s.table_number, s.seat_number
       FROM student_preferences sp
       LEFT JOIN seats s ON sp.favorite_seat_id = s.id
       WHERE sp.student_id = $1`,
      [student_id]
    );
    
    res.json(preferences.rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * UPDATE STUDENT PREFERENCES
 * Saves student's preferences including favorite seat
 * @route PUT /api/student/preferences/:student_id
 */
export async function updatePreferences(req, res) {
  try {
    const { student_id } = req.params;
    const { favorite_seat_id, preferred_floor, notifications_enabled, email_reminders } = req.body;
    const pool = await getDb();
    
    await pool.query(
      `UPDATE student_preferences 
       SET favorite_seat_id = COALESCE($1, favorite_seat_id),
           preferred_floor = COALESCE($2, preferred_floor),
           notifications_enabled = COALESCE($3, notifications_enabled),
           email_reminders = COALESCE($4, email_reminders),
           updated_at = NOW()
       WHERE student_id = $5`,
      [favorite_seat_id, preferred_floor, notifications_enabled, email_reminders, student_id]
    );
    
    res.json({ success: true, message: 'Preferences updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET FAVORITE SEAT
 * Returns student's favorite seat if currently available
 * @route GET /api/student/favorite-seat/:student_id
 */
export async function getFavoriteSeat(req, res) {
  try {
    const { student_id } = req.params;
    const pool = await getDb();
    
    const favorite = await pool.query(
      `SELECT s.* FROM seats s
       JOIN student_preferences sp ON sp.favorite_seat_id = s.id
       WHERE sp.student_id = $1 AND s.status = 'available'`,
      [student_id]
    );
    
    res.json({ favorite_seat: favorite.rows[0] || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============ BOOKING ============

/**
 * GET AVAILABLE SEATS
 * Returns all seats with 'available' status, optionally filtered by floor
 * @route GET /api/student/seats/available
 * @query {number} floor - Optional floor filter (1 or 2)
 */
export async function getAvailableSeats(req, res) {
  try {
    const { floor, date } = req.query;
    const pool = await getDb();
    
    let query = `SELECT * FROM seats WHERE status = 'available'`;
    let params = [];
    
    if (floor) {
      query += ` AND floor_number = $1`;
      params.push(floor);
    }
    
    query += ` ORDER BY floor_number, table_number, seat_number`;
    
    const result = await pool.query(query, params);
    
    res.json({
      total: result.rows.length,
      seats: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * BOOK A SEAT
 * Creates a booking for a specific seat and date
 * - Today's bookings are auto-verified
 * - Future bookings require admin verification
 * - Maximum 2 bookings per day for same-day bookings
 * - Booking expires in 30 minutes
 * 
 * @route POST /api/student/book
 */
export async function bookSeat(req, res) {
  try {
    const { student_id, seat_id, student_name, booking_date } = req.body;
    
    if (!student_id || !seat_id) {
      return res.status(400).json({ error: 'Student ID and Seat ID are required' });
    }
    
    const pool = await getDb();
    
    // Verify student exists
    const student = await pool.query(
      'SELECT * FROM students WHERE student_id = $1',
      [student_id]
    );
    
    if (student.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found. Please sign up first.' });
    }
    
    // Verify seat is available
    const seat = await pool.query(
      'SELECT * FROM seats WHERE id = $1 AND status = $2',
      [seat_id, 'available']
    );
    
    if (seat.rows.length === 0) {
      return res.status(400).json({ error: 'Seat is not available' });
    }
    
    // Check daily booking limit for today's bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayBookings = await pool.query(
      `SELECT COUNT(*) FROM bookings 
       WHERE student_id = $1 
       AND DATE(booking_time) = CURRENT_DATE 
       AND cancelled = false`,
      [student_id]
    );
    
    // Determine if booking is for today or future
    let targetDate;
    let isTodayBooking = true;
    
    if (booking_date) {
      targetDate = new Date(booking_date);
      targetDate.setHours(0, 0, 0, 0);
      isTodayBooking = targetDate.getTime() === today.getTime();
    } else {
      targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
      isTodayBooking = true;
    }
    
    // Enforce daily limit only for today's bookings
    if (isTodayBooking && parseInt(todayBookings.rows[0].count) >= 2) {
      return res.status(400).json({ error: 'Maximum 2 bookings per day allowed for same-day bookings' });
    }
    
    // Set expiration time (30 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    
    // Auto-verify ONLY for today's bookings
    const isAutoVerified = isTodayBooking;
    
    // Update seat status to booked
    await pool.query(
      'UPDATE seats SET status = $1 WHERE id = $2',
      ['booked', seat_id]
    );
    
    // Create booking record
    const booking = await pool.query(
      `INSERT INTO bookings (seat_id, student_id, student_name, expires_at, booking_date, verified) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [seat_id, student_id, student_name || student.rows[0].full_name, expiresAt, targetDate, isAutoVerified]
    );
    
    // Prepare response message
    let message = '';
    if (isTodayBooking) {
      message = '✅ Seat booked successfully for TODAY! Auto-verified. You can proceed to your seat.';
    } else {
      message = `⏳ Seat booked successfully for ${targetDate.toLocaleDateString()}! Pending admin verification. Please wait for admin approval.`;
    }
    
    res.json({
      success: true,
      message: message,
      booking: booking.rows[0],
      expires_at: expiresAt,
      auto_verified: isAutoVerified,
      booking_date: targetDate,
      is_future_booking: !isTodayBooking
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET MY BOOKINGS
 * Returns all bookings for the authenticated student
 * @route GET /api/student/my-bookings/:studentId
 */
export async function getMyBookings(req, res) {
  try {
    const { studentId } = req.params;
    const pool = await getDb();
    
    const result = await pool.query(
      `SELECT b.*, s.floor_number, s.table_number, s.seat_number, s.seat_label 
       FROM bookings b
       JOIN seats s ON b.seat_id = s.id
       WHERE b.student_id = $1
       ORDER BY b.booking_date DESC, b.booking_time DESC`,
      [studentId]
    );
    
    res.json({
      total: result.rows.length,
      bookings: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET MY BOOKINGS WITH FILTERS
 * Returns student's bookings filtered by date range and/or status
 * 
 * @route GET /api/student/my-bookings-filtered/:studentId
 * @query {string} date_range - 'today', 'week', or 'month'
 * @query {string} status - 'verified', 'pending', 'cancelled', or 'expired'
 */
export async function getMyBookingsWithFilters(req, res) {
  try {
    const { studentId } = req.params;
    const { date_range, status } = req.query;
    const pool = await getDb();
    
    let query = `
      SELECT b.*, s.floor_number, s.table_number, s.seat_number, s.seat_label 
      FROM bookings b
      JOIN seats s ON b.seat_id = s.id
      WHERE b.student_id = $1
    `;
    let params = [studentId];
    
    // Apply date range filter
    if (date_range === 'today') {
      query += ` AND DATE(b.booking_date) = CURRENT_DATE`;
    } else if (date_range === 'week') {
      query += ` AND b.booking_date >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (date_range === 'month') {
      query += ` AND b.booking_date >= CURRENT_DATE - INTERVAL '30 days'`;
    }
    
    // Apply status filter
    if (status === 'verified') {
      query += ` AND b.verified = true`;
    } else if (status === 'pending') {
      query += ` AND b.verified = false AND b.cancelled = false`;
    } else if (status === 'cancelled') {
      query += ` AND b.cancelled = true`;
    } else if (status === 'expired') {
      query += ` AND b.expires_at < NOW() AND b.verified = false`;
    }
    
    query += ` ORDER BY b.booking_date DESC, b.booking_time DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      total: result.rows.length,
      filters: { date_range, status },
      bookings: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * CANCEL BOOKING
 * Cancels an active booking and releases the seat
 * @route DELETE /api/student/booking/:bookingId
 */
export async function cancelBooking(req, res) {
  try {
    const { bookingId } = req.params;
    const pool = await getDb();
    
    // Get seat_id before updating
    const booking = await pool.query(
      'SELECT seat_id FROM bookings WHERE id = $1 AND cancelled = false',
      [bookingId]
    );
    
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Mark booking as cancelled
    await pool.query(
      `UPDATE bookings 
       SET cancelled = true, 
           cancelled_by = 'student',
           cancelled_at = NOW(),
           cancellation_reason = 'Cancelled by student'
       WHERE id = $1`,
      [bookingId]
    );
    
    // Release the seat back to available
    await pool.query(
      'UPDATE seats SET status = $1 WHERE id = $2',
      ['available', booking.rows[0].seat_id]
    );
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}