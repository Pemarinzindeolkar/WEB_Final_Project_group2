import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;

export async function initializeDatabase() {
  db = await open({
    filename: join(__dirname, 'library.db'),
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER NOT NULL,
      chair_number INTEGER NOT NULL,
      status TEXT DEFAULT 'available',
      booked_by TEXT,
      student_id TEXT,
      booked_at DATETIME,
      expires_at DATETIME,
      reached BOOLEAN DEFAULT 0,
      UNIQUE(table_number, chair_number)
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
  `);

  // Check if seats exist
  const seatCount = await db.get('SELECT COUNT(*) as count FROM seats');
  
  if (seatCount.count === 0) {
    // Create 10 tables, each with 2 chairs
    const seats = [];
    for (let table = 1; table <= 10; table++) {
      for (let chair = 1; chair <= 2; chair++) {
        seats.push({
          table_number: table,
          chair_number: chair,
          status: 'available'
        });
      }
    }
    
    for (const seat of seats) {
      await db.run(
        'INSERT INTO seats (table_number, chair_number, status) VALUES (?, ?, ?)',
        [seat.table_number, seat.chair_number, seat.status]
      );
    }
  }

  // Check if admin exists
  const adminCount = await db.get('SELECT COUNT(*) as count FROM admins');
  
  if (adminCount.count === 0) {
    // Default admin: username: admin, password: admin123
    await db.run(
      'INSERT INTO admins (username, password) VALUES (?, ?)',
      ['admin', 'admin123']
    );
  }

  console.log('Database initialized successfully');
  return db;
}

export async function getDb() {
  if (!db) {
    await initializeDatabase();
  }
  return db;
}

export async function cleanupExpiredBookings() {
  const db = await getDb();
  const now = new Date().toISOString();
  
  const result = await db.run(`
    UPDATE seats 
    SET status = 'available', 
        booked_by = NULL, 
        student_id = NULL, 
        booked_at = NULL, 
        expires_at = NULL,
        reached = 0
    WHERE status = 'booked' 
    AND expires_at < ?
    AND reached = 0
  `, [now]);
  
  if (result.changes > 0) {
    console.log(`Cleaned up ${result.changes} expired bookings`);
  }
}