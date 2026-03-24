import express from "express";
import {
  fetchSeats,
  reserveSeat,
  releaseSeat
} from "../controllers/seatController.js";

const router = express.Router();

router.get("/", fetchSeats);
router.post("/book", reserveSeat);
router.post("/cancel", releaseSeat);

export default router;