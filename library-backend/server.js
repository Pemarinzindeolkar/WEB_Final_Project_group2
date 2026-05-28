/**
 * SERVER.JS
 * Main entry point for the Library Booking System backend
 * Sets up Express server, middleware, routes, and static file serving
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import studentRoutes from "./routes/studentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

// Get current directory name (ES modules equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARE ============
app.use(cors());                          // Enable Cross-Origin Resource Sharing
app.use(express.json());                  // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Serve static files (HTML, CSS, JS) from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// ============ API ROUTES ============
app.use("/api/student", studentRoutes);   // Student endpoints (registration, login, booking)
app.use("/api/admin", adminRoutes);       // Admin endpoints (login, verification, statistics)

// ============ HEALTH CHECK ============
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Library Booking System API is running",
    timestamp: new Date().toISOString()
  });
});

// ============ FRONTEND ROUTES ============
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get("/student.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'student.html'));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin.html'));
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Student Portal: http://localhost:${PORT}/student.html`);
  console.log(`Admin Portal: http://localhost:${PORT}/admin.html`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// ============ BACKGROUND SERVICES ============
// Import reminder scheduler to send email reminders for upcoming bookings
import './utils/reminderScheduler.js';