import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';

let pool;

export async function getDb() {
  if (!pool) {
    pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'library_db',
      user: 'pema',
      password: '',
    });
  }
  return pool;
}

export async function initializeDatabase() {
  const pool = await getDb();
  const client = await pool.connect();
  
  try {
    console.log('Creating tables...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(20) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
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
    `);
    
    console.log('Tables created successfully!');
    
    // Check if seats exist
    const seatCount = await client.query('SELECT COUNT(*) FROM seats');
    
    if (parseInt(seatCount.rows[0].count) === 0) {
      console.log('Creating 200 seats...');
      
      for (let floor = 1; floor <= 2; floor++) {
        for (let table = 1; table <= 25; table++) {
          for (let seat = 1; seat <= 4; seat++) {
            const floorName = floor === 1 ? 'Ground Floor' : 'First Floor';
            const seatLabel = `${floorName} - Table ${table}, Seat ${seat}`;
            
            await client.query(
              'INSERT INTO seats (floor_number, table_number, seat_number, seat_label, status) VALUES ($1, $2, $3, $4, $5)',
              [floor, table, seat, seatLabel, 'available']
            );
          }
        }
      }
      console.log('200 seats created!');
    }
    
    // Check if admin exists
    const adminCount = await client.query('SELECT COUNT(*) FROM admins');
    
    if (parseInt(adminCount.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO admins (username, password_hash, full_name) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, 'Library Admin']
      );
      console.log('Admin user created! Username: admin, Password: admin123');
    }
    
    console.log('Database setup complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
  }
}

export async function cleanupExpiredBookings() {
  const pool = await getDb();
  const client = await pool.connect();
  
  try {
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

export function startCleanupScheduler() {
  setInterval(async () => {
    await cleanupExpiredBookings();
  }, 60000);
}

// Run initialization
await initializeDatabase();
startCleanupScheduler();
