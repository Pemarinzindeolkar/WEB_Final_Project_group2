import { getDb } from '../database.js';

// Register a new student
export async function registerStudent(req, res) {
  try {
    const { student_id, full_name, email, phone } = req.body;
    
    if (!student_id || !full_name) {
      return res.status(400).json({ error: 'Student ID and full name are required' });
    }
    
    const pool = await getDb();
    
    const existing = await pool.query(
      'SELECT * FROM students WHERE student_id = $1',
      [student_id]
    );
    
    if (existing.rows.length > 0) {
      return res.json({ 
        success: true, 
        message: 'Student already registered',
        student: existing.rows[0]
      });
    }
    
    const result = await pool.query(
      `INSERT INTO students (student_id, full_name, email, phone) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, full_name, email || null, phone || null]
    );
    
    res.json({
      success: true,
      message: 'Student registered successfully',
      student: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get available seats
export async function getAvailableSeats(req, res) {
  try {
    const { floor } = req.query;
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

// Book a seat
export async function bookSeat(req, res) {
  try {
    const { student_id, seat_id, student_name } = req.body;
    
    if (!student_id || !seat_id) {
      return res.status(400).json({ error: 'Student ID and Seat ID are required' });
    }
    
    const pool = await getDb();
    
    const seat = await pool.query(
      'SELECT * FROM seats WHERE id = $1 AND status = $2',
      [seat_id, 'available']
    );
    
    if (seat.rows.length === 0) {
      return res.status(400).json({ error: 'Seat is not available' });
    }
    
    const activeBooking = await pool.query(
      `SELECT * FROM bookings 
       WHERE student_id = $1 
       AND verified = false 
       AND cancelled = false 
       AND expires_at > NOW()`,
      [student_id]
    );
    
    if (activeBooking.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You already have an active booking. Please cancel it or wait for admin verification.' 
      });
    }
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    
    await pool.query(
      'UPDATE seats SET status = $1 WHERE id = $2',
      ['booked', seat_id]
    );
    
    const booking = await pool.query(
      `INSERT INTO bookings (seat_id, student_id, student_name, expires_at) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [seat_id, student_id, student_name || 'Unknown', expiresAt]
    );
    
    res.json({
      success: true,
      message: 'Seat booked successfully! Please inform admin for verification within 30 minutes.',
      booking: booking.rows[0],
      expires_at: expiresAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get student's booking history
export async function getMyBookings(req, res) {
  try {
    const { studentId } = req.params;
    const pool = await getDb();
    
    const result = await pool.query(
      `SELECT b.*, s.floor_number, s.table_number, s.seat_number, s.seat_label 
       FROM bookings b
       JOIN seats s ON b.seat_id = s.id
       WHERE b.student_id = $1
       ORDER BY b.booking_time DESC`,
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

// Cancel a booking
export async function cancelBooking(req, res) {
  try {
    const { bookingId } = req.params;
    const pool = await getDb();
    
    const booking = await pool.query(
      'SELECT seat_id FROM bookings WHERE id = $1 AND cancelled = false',
      [bookingId]
    );
    
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    await pool.query(
      `UPDATE bookings 
       SET cancelled = true, 
           cancelled_by = 'student',
           cancelled_at = NOW(),
           cancellation_reason = 'Cancelled by student'
       WHERE id = $1`,
      [bookingId]
    );
    
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
