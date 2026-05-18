import nodemailer from 'nodemailer';

// Configure email transporter (use your email service)
// For Gmail: Enable "Less secure app access" or use App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

export async function sendResetEmail(to, resetToken, studentName) {
  const resetLink = `http://localhost:3000/reset-password.html?token=${resetToken}`;
  
  const mailOptions = {
    from: '"Library System" <noreply@library.com>',
    to: to,
    subject: 'Password Reset Request',
    html: `
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
  
  return transporter.sendMail(mailOptions);
}

export async function sendReminderEmail(to, studentName, bookingDetails) {
  const mailOptions = {
    from: '"Library System" <reminder@library.com>',
    to: to,
    subject: 'Booking Reminder',
    html: `
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
  
  return transporter.sendMail(mailOptions);
}
