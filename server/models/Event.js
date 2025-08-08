const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Event = sequelize.define("Event", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 200],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM(
      "seminar",
      "workshop",
      "theater",
      "competition",
      "performance",
      "other"
    ),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM("academic", "performance", "competition", "cultural"),
    allowNull: false,
  },
  eventDate: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfter: new Date().toISOString(),
    },
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  venue: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "UPAT Main Theater",
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.0,
  },
  vipPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.0,
  },
  maxSeats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 500,
    validate: {
      min: 1,
      max: 1500, // increased to support expanded venue layout (e.g., 1196 seats)
    },
  },
  availableSeats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 500,
  },
  status: {
    type: DataTypes.ENUM(
      "draft",
      "published",
      "sold_out",
      "cancelled",
      "completed"
    ),
    defaultValue: "draft",
  },
  posterImage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  organizer: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "UPAT",
  },
  requiresApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
});

module.exports = Event;
