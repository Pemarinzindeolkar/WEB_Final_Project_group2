import { getDb } from '../database.js';

export async function adminLogin(req, res) {
  try {
    const { username, password } = req.body;
    const db = await getDb();
    
    const admin = await db.get(
      'SELECT * FROM admins WHERE username = ? AND password = ?',
      [username, password]
    );
    
    if (admin) {
      // Generate simple token (in production, use JWT)
      const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
      res.json({ success: true, token, username: admin.username });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllSeats(req, res) {
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

export async function removeBooking(req, res) {
  try {
    const { seatId } = req.params;
    const db = await getDb();
    
    await db.run(`
      UPDATE seats 
      SET status = 'available', 
          booked_by = NULL, 
          student_id = NULL, 
          booked_at = NULL, 
          expires_at = NULL,
          reached = 0
      WHERE id = ?
    `, [seatId]);
    
    res.json({ success: true, message: 'Booking removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function resetSeat(req, res) {
  try {
    const { seatId } = req.params;
    const db = await getDb();
    
    await db.run(`
      UPDATE seats 
      SET status = 'available', 
          booked_by = NULL, 
          student_id = NULL, 
          booked_at = NULL, 
          expires_at = NULL,
          reached = 0
      WHERE id = ?
    `, [seatId]);
    
    res.json({ success: true, message: 'Seat reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getStatistics(req, res) {
  try {
    const db = await getDb();
    
    const totalSeats = await db.get('SELECT COUNT(*) as count FROM seats');
    const availableSeats = await db.get("SELECT COUNT(*) as count FROM seats WHERE status = 'available'");
    const bookedSeats = await db.get("SELECT COUNT(*) as count FROM seats WHERE status = 'booked'");
    const reachedSeats = await db.get("SELECT COUNT(*) as count FROM seats WHERE reached = 1");
    const activeBookings = await db.get("SELECT COUNT(*) as count FROM seats WHERE status = 'booked' AND reached = 0");
    
    res.json({
      totalSeats: totalSeats.count,
      availableSeats: availableSeats.count,
      bookedSeats: bookedSeats.count,
      reachedSeats: reachedSeats.count,
      activeBookings: activeBookings.count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}