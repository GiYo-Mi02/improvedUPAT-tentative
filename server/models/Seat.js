const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Seat = sequelize.define(
  "Seat",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "events",
        key: "id",
      },
      field: "event_id", // map camelCase attribute to snake_case column
    },
    section: {
      // Replaced ENUM with STRING to support dynamic auditorium section names
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 60],
      },
    },
    row: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 3],
      },
    },
    number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 50,
      },
    },
    isReserved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isVip: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isAccessible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    holdExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("available", "reserved", "sold", "blocked"),
      defaultValue: "available",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["event_id", "section", "row", "number"], // composite uniqueness
      },
      { fields: ["event_id"] },
      { fields: ["event_id", "status"] },
    ],
  }
);

module.exports = Seat;
