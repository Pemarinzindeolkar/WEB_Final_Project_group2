import express from "express";
import cors from "cors";
import seatRoutes from "./routes/seatRoutes.js";

const app = express();

app.use(cors());

// 🔹 This line is critical!
app.use(express.json());          // parses JSON bodies
app.use(express.urlencoded({ extended: true })); // optional for form data

// Routes
app.use("/api/seats", seatRoutes);

app.get("/", (req, res) => {
  res.send("Seat Booking API Running");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});