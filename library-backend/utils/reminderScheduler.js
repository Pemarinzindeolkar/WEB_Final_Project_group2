/**
 * REMINDER SCHEDULER
 * Automatically sends email reminders for upcoming bookings
 * Runs every 30 minutes
 */

import { getDb } from '../database.js';
import { sendReminderEmail } from '../config/email.js';

/**
 * Check for upcoming bookings and send reminders
 * Looks for bookings that:
 * - Are not verified
 * - Are not cancelled
 * - Expire within the next hour
 * - Haven't received a reminder yet
 */
export async function checkAndSendReminders() {
  const pool = await getDb();
  
  // Get bookings that expire in the next hour
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
  
  // Send reminder email for each upcoming booking
  for (const booking of upcomingBookings.rows) {
    if (booking.email) {
      await sendReminderEmail(booking.email, booking.full_name, booking);
      // Record that reminder was sent to prevent duplicates
      await pool.query(
        `INSERT INTO booking_notifications (student_id, booking_id, type) 
         VALUES ($1, $2, 'reminder')`,
        [booking.student_id, booking.id]
      );
    }
  }
}

// Start the scheduler - runs every 30 minutes (1,800,000 milliseconds)
setInterval(checkAndSendReminders, 30 * 60 * 1000);