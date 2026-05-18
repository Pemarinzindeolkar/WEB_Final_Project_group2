import { getDb } from '../database.js';
import { sendReminderEmail } from '../config/email.js';

export async function checkAndSendReminders() {
  const pool = await getDb();
  
  // Get bookings that expire in 1 hour
  const upcomingBookings = await pool.query(`
    SELECT b.*, s.seat_label, stu.email, stu.full_name
    FROM bookings b
    JOIN seats s ON b.seat_id = s.id
    JOIN students stu ON b.student_id = stu.student_id
    WHERE b.verified = false 
      AND b.cancelled = false
      AND b.expires_at > NOW()
      AND b.expires_at < NOW() + INTERVAL '1 hour'
      AND NOT EXISTS (
        SELECT 1 FROM booking_notifications n 
        WHERE n.booking_id = b.id AND n.type = 'reminder'
      )
  `);
  
  for (const booking of upcomingBookings.rows) {
    if (booking.email) {
      await sendReminderEmail(booking.email, booking.full_name, booking);
      await pool.query(
        `INSERT INTO booking_notifications (student_id, booking_id, type) 
         VALUES ($1, $2, 'reminder')`,
        [booking.student_id, booking.id]
      );
    }
  }
}

// Run every 30 minutes
setInterval(checkAndSendReminders, 30 * 60 * 1000);
