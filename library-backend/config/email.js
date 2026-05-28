// Import the nodemailer library for sending emails
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',                                // Email service provider (Google's Gmail)
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',      // Email address (from .env or fallback)
    pass: process.env.EMAIL_PASS || 'your-app-password'          // App password (from .env or fallback)
  }
});

/**
 * SEND PASSWORD RESET EMAIL
 * 
 * This function is called when a student requests a password reset.
 * It generates a unique reset link and sends it to the student's email address.
 * 
 * @param {string} to - Recipient's email address
 * @param {string} resetToken - Unique token for password reset verification
 * @param {string} studentName - Student's full name (for personalization)
 * @returns {Promise} - Returns the result of the email send operation
 */
export async function sendResetEmail(to, resetToken, studentName) {
  // Construct the password reset link with the unique token
  // The token will be validated when the user clicks the link
  const resetLink = `http://localhost:3000/reset-password.html?token=${resetToken}`;
  
  // Configure email content and formatting
  const mailOptions = {
    from: '"Library System" <noreply@library.com>',    // Sender name and email address
    to: to,                                            // Recipient email address
    subject: 'Password Reset Request',                 // Email subject line
    html: `                                            // HTML formatted email body
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4A90E2;">Password Reset Request</h2>
        <p>Hello ${studentName},</p>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background: #4A90E2; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr>
        <small>Library Booking System</small>
      </div>
    `
  };
  
  // Send the email using the configured transporter
  return transporter.sendMail(mailOptions);
}

/**
 * SEND BOOKING REMINDER EMAIL
 * 
 * This function is called to remind students about their upcoming bookings.
 * It sends details about the booked seat, date, and time.
 * 
 * @param {string} to - Recipient's email address
 * @param {string} studentName - Student's full name (for personalization)
 * @param {object} bookingDetails - Object containing booking information
 * @param {string} bookingDetails.seat_label - Label/identifier of the booked seat
 * @param {string} bookingDetails.booking_date - Date of the booking
 * @param {string} bookingDetails.booking_time - Time when the booking was made
 * @returns {Promise} - Returns the result of the email send operation
 */
export async function sendReminderEmail(to, studentName, bookingDetails) {
  // Configure email content for booking reminder
  const mailOptions = {
    from: '"Library System" <reminder@library.com>',  // Sender name and email address
    to: to,                                            // Recipient email address
    subject: 'Booking Reminder',                      // Email subject line
    html: `                                            // HTML formatted email body
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4A90E2;">Booking Reminder</h2>
        <p>Hello ${studentName},</p>
        <p>This is a reminder for your upcoming booking:</p>
        <div style="background: #f0f8ff; padding: 15px; border-radius: 8px;">
          <p><strong>Seat:</strong> ${bookingDetails.seat_label}</p>
          <p><strong>Date:</strong> ${bookingDetails.booking_date}</p>
          <p><strong>Time:</strong> ${new Date(bookingDetails.booking_time).toLocaleTimeString()}</p>
        </div>
        <p>Please arrive on time. Your booking expires in 30 minutes.</p>
        <hr>
        <small>Library Booking System</small>
      </div>
    `
  };
  
  // Send the email using the configured transporter
  return transporter.sendMail(mailOptions);
}