import db from "../config/db.js";

export const getAllSeats = (callback) => {
  db.query("SELECT * FROM seats", callback);
};

export const getSeatBySeatNo = (seatNo, callback) => {
  db.query("SELECT * FROM seats WHERE seatNo = ?", [seatNo], callback);
};

export const bookSeat = (seatNo, userName, callback) => {
  db.query(
    "UPDATE seats SET isBooked = true, userName = ? WHERE seatNo = ?",
    [userName, seatNo],
    callback
  );
};

export const cancelSeat = (seatNo, callback) => {
  db.query(
    "UPDATE seats SET isBooked = false, userName = NULL WHERE seatNo = ?",
    [seatNo],
    callback
  );
};