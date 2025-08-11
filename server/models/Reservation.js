const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Reservation = sequelize.define(
  "Reservation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      field: "user_id",
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "events",
        key: "id",
      },
      field: "event_id",
    },
    seatId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "seats",
        key: "id",
      },
      field: "seat_id",
    },
    reservationCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "confirmed",
        "cancelled",
        "expired",
        "used"
      ),
      defaultValue: "pending",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    paymentStatus: {
      type: DataTypes.ENUM("pending", "paid", "failed", "refunded"),
      defaultValue: "pending",
    },
    paymentMethod: {
      type: DataTypes.ENUM("free", "cash", "gcash", "paymaya", "card"),
      allowNull: true,
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qrCode: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    emailSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    checkedIn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    checkedInAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    hooks: {
      beforeValidate: async (reservation) => {
        // Generate reservation code early (before validation) to avoid notNull violation
        if (!reservation.reservationCode) {
          reservation.reservationCode =
            "UPAT-" +
            Date.now().toString(36).toUpperCase() +
            "-" +
            Math.random().toString(36).substr(2, 4).toUpperCase();
        }
        // Set expiry (24 hours for paid events, 2 hours for free events) before validation
        if (!reservation.expiresAt) {
          const amount = parseFloat(reservation.totalAmount || 0);
          const expiryHours = amount > 0 ? 24 : 2;
          reservation.expiresAt = new Date(
            Date.now() + expiryHours * 60 * 60 * 1000
          );
        }
      },
      // Retain beforeCreate as a safety net (optional)
      beforeCreate: (reservation) => {
        if (!reservation.reservationCode) return; // already set
        if (!reservation.expiresAt) {
          const amount = parseFloat(reservation.totalAmount || 0);
          const expiryHours = amount > 0 ? 24 : 2;
          reservation.expiresAt = new Date(
            Date.now() + expiryHours * 60 * 60 * 1000
          );
        }
      },
    },
  },
  {
    indexes: [
      { fields: ["user_id"] },
      { fields: ["event_id"] },
      { fields: ["seat_id"] },
      { unique: true, fields: ["reservationCode"] },
    ],
  }
);

module.exports = Reservation;
