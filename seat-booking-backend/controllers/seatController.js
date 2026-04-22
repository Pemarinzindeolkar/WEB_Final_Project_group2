import { getDb } from '../database.js';

export async function getAvailableSeats(req, res) {
  try {
    const db = await getDb();
    const seats = await db.all(`
      SELECT id, table_number, chair_number, status, 
             booked_by, student_id, booked_at, expires_at, reached
      FROM seats 
      ORDER BY table_number, chair_number
    `);
    
    res.json(seats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getSeatStatus(req, res) {
  try {
    const db = await getDb();
    const seats = await db.all(`
      SELECT id, table_number, chair_number, status, 
             booked_by, student_id, booked_at, expires_at, reached
      FROM seats 
      ORDER BY table_number, chair_number
    `);
    
    const totalSeats = seats.length;
    const availableSeats = seats.filter(s => s.status === 'available').length;
    const bookedSeats = seats.filter(s => s.status === 'booked').length;
    
    res.json({
      totalSeats,
      availableSeats,
      bookedSeats,
      seats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function bookSeat(req, res) {
  try {
    const { seatId, studentId, studentName } = req.body;
    
    if (!seatId || !studentId || !studentName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate student ID format (example: STU + 8 digits)
    const studentIdRegex = /^STU\d{8}$/;
    if (!studentIdRegex.test(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID format. Use STU followed by 8 digits (e.g., STU20240001)' });
    }
    
    const db = await getDb();
    
    // Check if seat exists and is available
    const seat = await db.get('SELECT * FROM seats WHERE id = ?', [seatId]);
    
    if (!seat) {
      return res.status(404).json({ error: 'Seat not found' });
    }
    
    if (seat.status !== 'available') {
      return res.status(400).json({ error: 'Seat is not available' });
    }
    
    // Check if student already has an active booking
    const existingBooking = await db.get(`
      SELECT * FROM seats 
      WHERE student_id = ? AND status = 'booked' AND reached = 0
    `, [studentId]);
    
    if (existingBooking) {
      return res.status(400).json({ 
        error: 'You already have an active booking. Please reach the seat or wait for it to expire.' 
      });
    }
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
    
    await db.run(`
      UPDATE seats 
      SET status = 'booked', 
          booked_by = ?, 
          student_id = ?, 
          booked_at = ?,
          expires_at = ?,
          reached = 0
      WHERE id = ?
    `, [studentName, studentId, now.toISOString(), expiresAt.toISOString(), seatId]);
    
    const updatedSeat = await db.get('SELECT * FROM seats WHERE id = ?', [seatId]);
    
    res.json({ 
      success: true, 
      message: `Seat booked successfully! You have 30 minutes to reach the seat.`,
      seat: updatedSeat,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function markReached(req, res) {
  try {
    const { seatId } = req.params;
    const { studentId } = req.body;
    
    const db = await getDb();
    
    const seat = await db.get('SELECT * FROM seats WHERE id = ?', [seatId]);
    
    if (!seat) {
      return res.status(404).json({ error: 'Seat not found' });
    }
    
    if (seat.student_id !== studentId) {
      return res.status(403).json({ error: 'You are not authorized to mark this seat as reached' });
    }
    
    if (seat.reached === 1) {
      return res.status(400).json({ error: 'Seat already marked as reached' });
    }
    
    await db.run(`
      UPDATE seats 
      SET reached = 1
      WHERE id = ?
    `, [seatId]);
    
    res.json({ success: true, message: 'Seat marked as reached. Booking confirmed!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}