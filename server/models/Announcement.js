const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Announcement = sequelize.define(
  "Announcement",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    imagePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "image_path",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "starts_at",
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "ends_at",
    },
  },
  {
    indexes: [
      { fields: ["is_active", "priority"] },
      { fields: ["starts_at", "ends_at"] },
    ],
  }
);

module.exports = Announcement;
