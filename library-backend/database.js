/**
 * DATABASE CONNECTION AND INITIALIZATION
 * PostgreSQL database setup, connection pooling, and maintenance
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

let pool;

/**
 * GET DATABASE CONNECTION POOL
 * Creates and returns a connection pool to PostgreSQL
 * Uses environment variables for configuration, falls back to local defaults
 */
export async function getDb() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'library_db',
      user: process.env.DB_USER || 'pema',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

/**
 * INITIALIZE DATABASE
 * Creates all tables if they don't exist
 * Populates 200 seats (2 floors × 25 tables × 4 chairs)
 * Creates default admin user
 */
export async function initializeDatabase() {
  const pool = await getDb();
  const client = await pool.connect();
  
  try {
    console.log('Creating tables...');
    
    // Create students table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(20) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS seats (
        id SERIAL PRIMARY KEY,
        floor_number INTEGER NOT NULL,
        table_number INTEGER NOT NULL,
        seat_number INTEGER NOT NULL,
        seat_label VARCHAR(100) NOT NULL,
        zone VARCHAR(50) DEFAULT 'General',
        status VARCHAR(20) DEFAULT 'available'
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        seat_id INTEGER NOT NULL REFERENCES seats(id),
        student_id VARCHAR(20) NOT NULL REFERENCES students(student_id),
        student_name VARCHAR(100) NOT NULL,
        booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        booking_date DATE DEFAULT CURRENT_DATE,
        verified BOOLEAN DEFAULT FALSE,
        verified_by VARCHAR(50),
        verified_at TIMESTAMP,
        cancelled BOOLEAN DEFAULT FALSE,
        cancelled_by VARCHAR(50),
        cancelled_at TIMESTAMP,
        cancellation_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS student_preferences (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL REFERENCES students(student_id),
        favorite_seat_id INTEGER REFERENCES seats(id),
        preferred_floor INTEGER,
        notifications_enabled BOOLEAN DEFAULT TRUE,
        email_reminders BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL REFERENCES students(student_id),
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_seat ON bookings(seat_id);
      CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status, floor_number);
    `);
    
    console.log('Tables created successfully!');
    
    // Check if seats exist, if not create 200 seats
    const seatCount = await client.query('SELECT COUNT(*) FROM seats');
    
    if (parseInt(seatCount.rows[0].count) === 0) {
      console.log('Creating 200 seats...');
      
      // Generate seats: 2 floors, 25 tables per floor, 4 chairs per table
      for (let floor = 1; floor <= 2; floor++) {
        for (let table = 1; table <= 25; table++) {
          for (let seat = 1; seat <= 4; seat++) {
            const floorName = floor === 1 ? 'Ground Floor' : 'First Floor';
            const seatLabel = `${floorName} - Table ${table}, Seat ${seat}`;
            let zone = 'General';
            
            // Assign zones based on table number
            if (table <= 5) zone = 'Quiet Zone';
            else if (table <= 15) zone = 'Group Study';
            else zone = 'General Area';
            
            await client.query(
              `INSERT INTO seats (floor_number, table_number, seat_number, seat_label, zone, status) 
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [floor, table, seat, seatLabel, zone, 'available']
            );
          }
        }
      }
      console.log('Created 200 seats!');
    }

    // Create default admin user if none exists
    const adminCount = await client.query('SELECT COUNT(*) FROM admins');
    
    if (parseInt(adminCount.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await client.query(
        `INSERT INTO admins (username, password_hash, full_name) 
         VALUES ($1, $2, $3)`,
        ['admin', hashedPassword, 'Library Administrator']
      );
      console.log('Admin user created! Username: admin, Password: admin123');
    }

    console.log('Database setup complete!');
    
  } catch (error) {
    console.error('Database initialization error:', error.message);
  } finally {
    client.release();
  }
}

/**
 * CLEANUP EXPIRED BOOKINGS
 * Finds unverified bookings that have passed their expiration time
 * Marks them as cancelled and releases the associated seats
 * Runs automatically every minute
 */
export async function cleanupExpiredBookings() {
  const pool = await getDb();
  const client = await pool.connect();
  
  try {
    // Find expired unverified bookings
    const result = await client.query(`
      UPDATE bookings 
      SET cancelled = TRUE, 
          cancelled_by = 'system',
          cancelled_at = NOW(),
          cancellation_reason = 'Expired - Not verified within 30 minutes'
      WHERE verified = FALSE 
        AND cancelled = FALSE 
        AND expires_at < NOW()
      RETURNING id
    `);
    
    // Release seats for expired bookings
    for (const booking of result.rows) {
      await client.query(`
        UPDATE seats 
        SET status = 'available' 
        WHERE id IN (SELECT seat_id FROM bookings WHERE id = $1)
      `, [booking.id]);
    }
    
    if (result.rows.length > 0) {
      console.log(`Cleaned up ${result.rows.length} expired bookings`);
    }
    
    return result.rows.length;
  } finally {
    client.release();
  }
}

/**
 * START CLEANUP SCHEDULER
 * Runs the cleanup function every 60 seconds (1 minute)
 */
export function startCleanupScheduler() {
  setInterval(async () => {
    await cleanupExpiredBookings();
  }, 60000);
}

// Initialize database and start cleanup scheduler
await initializeDatabase();
startCleanupScheduler();