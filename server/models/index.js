const User = require("./User");
const Event = require("./Event");
const Seat = require("./Seat");
const Reservation = require("./Reservation");
const Payment = require("./Payment");

// User associations
User.hasMany(Reservation, {
  foreignKey: { name: "userId", field: "user_id" },
  as: "reservations",
});
Reservation.belongsTo(User, {
  foreignKey: { name: "userId", field: "user_id" },
  as: "user",
});

// Event associations
Event.hasMany(Seat, {
  foreignKey: { name: "eventId", field: "event_id" },
  as: "seats",
});
Seat.belongsTo(Event, {
  foreignKey: { name: "eventId", field: "event_id" },
  as: "event",
});

Event.hasMany(Reservation, {
  foreignKey: { name: "eventId", field: "event_id" },
  as: "reservations",
});
Reservation.belongsTo(Event, {
  foreignKey: { name: "eventId", field: "event_id" },
  as: "event",
});

// Seat associations
Seat.hasMany(Reservation, {
  foreignKey: { name: "seatId", field: "seat_id" },
  as: "reservations",
});
Reservation.belongsTo(Seat, {
  foreignKey: { name: "seatId", field: "seat_id" },
  as: "seat",
});

// Payment associations
Reservation.hasMany(Payment, {
  foreignKey: { name: "reservationId", field: "reservation_id" },
  as: "payments",
});
Payment.belongsTo(Reservation, {
  foreignKey: { name: "reservationId", field: "reservation_id" },
  as: "reservation",
});

module.exports = {
  User,
  Event,
  Seat,
  Reservation,
  Payment,
};
