// Import the mysql2 library for database operations
import mysql from "mysql2";

// Create a connection object with database credentials
const db = mysql.createConnection({
  host: "localhost",        // Database server location (local machine)
  user: "root",             // MySQL username
  password: "prdeolkar7",   // MySQL password
  database: "seat_booking"  // Target database name
});

// Attempt to connect to the database
db.connect((err) => {
  if (err) {
    // Log error message if connection fails
    console.error("DB connection failed:", err);
  } else {
    // Log success message when connection is established
    console.log("MySQL Connected");
  }
});

// Export the database connection for use in other files
export default db;