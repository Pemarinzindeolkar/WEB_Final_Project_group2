import { getDb } from '../database.js';
import bcrypt from 'bcrypt';

// Admin login
export async function adminLogin(req, res) {
  try {
    const { username, password } = req.body;
    
    const pool = await getDb();
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      admin: {
        username: admin.username,
        full_name: admin.full_name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get all seats with booking info
export async function getAllSeats(req, res) {
  try {
    const pool = await getDb();
    
    const result = await pool.query(
      `SELECT s.*, 
        b.id as booking_id, 
        b.student_id, 
        b.student_name,
        b.booking_time,
        b.expires_at,
        b.verified
       FROM seats s
       LEFT JOIN bookings b ON s.id = b.seat_id 
        AND b.cancelled = false
       ORDER BY s.floor_number, s.table_number, s.seat_number`
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get all bookings
export async function getAllBookings(req, res) {
  try {
    const pool = await getDb();
    
    const result = await pool.query(
      `SELECT b.*, s.floor_number, s.table_number, s.seat_number, s.seat_label 
       FROM bookings b
       JOIN seats s ON b.seat_id = s.id
       ORDER BY b.booking_time DESC
       LIMIT 100`
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Verify a booking
export async function verifyBooking(req, res) {
  try {
    const { bookingId } = req.params;
    const { admin_name } = req.body;
    const pool = await getDb();
    
    const booking = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND verified = false AND cancelled = false`,
      [bookingId]
    );
    
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or already verified' });
    }
    
    await pool.query(
      `UPDATE bookings 
       SET verified = true, 
           verified_by = $1,
           verified_at = NOW()
       WHERE id = $2`,
      [admin_name || 'admin', bookingId]
    );
    
    res.json({
      success: true,
      message: 'Booking verified successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Remove booking (admin)
export async function removeBooking(req, res) {
  try {
    const { bookingId } = req.params;
    const pool = await getDb();
    
    const booking = await pool.query(
      'SELECT seat_id FROM bookings WHERE id = $1',
      [bookingId]
    );
    
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    await pool.query(
      `UPDATE bookings 
       SET cancelled = true, 
           cancelled_by = 'admin',
           cancelled_at = NOW(),
           cancellation_reason = 'Removed by admin'
       WHERE id = $1`,
      [bookingId]
    );
    
    await pool.query(
      'UPDATE seats SET status = $1 WHERE id = $2',
      ['available', booking.rows[0].seat_id]
    );
    
    res.json({
      success: true,
      message: 'Booking removed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get statistics
export async function getStatistics(req, res) {
  try {
    const pool = await getDb();
    
    const totalSeats = await pool.query('SELECT COUNT(*) as count FROM seats');
    const availableSeats = await pool.query("SELECT COUNT(*) as count FROM seats WHERE status = 'available'");
    const bookedSeats = await pool.query("SELECT COUNT(*) as count FROM seats WHERE status = 'booked'");
    const activeBookings = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE verified = false AND cancelled = false AND expires_at > NOW()"
    );
    const totalStudents = await pool.query('SELECT COUNT(*) as count FROM students');
    
    res.json({
      total_seats: parseInt(totalSeats.rows[0].count),
      available_seats: parseInt(availableSeats.rows[0].count),
      booked_seats: parseInt(bookedSeats.rows[0].count),
      active_bookings: parseInt(activeBookings.rows[0].count),
      total_students: parseInt(totalStudents.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
