import express from 'express';
import { getAvailableSeats, bookSeat, markReached, getSeatStatus } from '../controllers/seatController.js';

const router = express.Router();

router.get('/available', getAvailableSeats);
router.get('/status', getSeatStatus);
router.post('/book', bookSeat);
router.post('/reach/:seatId', markReached);

export default router;