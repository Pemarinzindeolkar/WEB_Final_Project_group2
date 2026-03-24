import {
    getAllSeats,
    getSeatBySeatNo,
    bookSeat,
    cancelSeat
  } from "../models/seatModel.js";
  
  export const fetchSeats = (req, res) => {
    getAllSeats((err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    });
  };
  
  export const reserveSeat = (req, res) => {
    const { seatNo, userName } = req.body;
  
    getSeatBySeatNo(seatNo, (err, results) => {
      if (err) return res.status(500).json(err);
  
      const seat = results[0];
  
      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }
  
      if (seat.isBooked) {
        return res.status(400).json({ message: "Seat already booked" });
      }
  
      bookSeat(seatNo, userName, (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Seat booked successfully" });
      });
    });
  };
  
  export const releaseSeat = (req, res) => {
    const { seatNo } = req.body;
  
    cancelSeat(seatNo, (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Seat cancelled" });
    });
  };