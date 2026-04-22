import express from "express";
import cors from "cors";
import seatRoutes from "./routes/seatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { initializeDatabase, cleanupExpiredBookings } from "./database.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('frontend'));

// Initialize database
await initializeDatabase();

// Run cleanup every minute
setInterval(cleanupExpiredBookings, 60000);

// Routes
app.use("/api/seats", seatRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + '/frontend/index.html');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});