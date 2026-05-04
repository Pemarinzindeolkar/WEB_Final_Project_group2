import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import studentRoutes from "./routes/studentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// API Routes
app.use("/api/student", studentRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Library Booking System API is running",
    timestamp: new Date().toISOString()
  });
});

// Handle root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Handle student.html route
app.get("/student.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'student.html'));
});

// Handle admin.html route
app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Student Portal: http://localhost:${PORT}/student.html`);
  console.log(`Admin Portal: http://localhost:${PORT}/admin.html`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
