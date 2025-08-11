const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const GalleryItem = sequelize.define(
  "GalleryItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imagePath: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      // Use explicit field to avoid any ambiguity
      field: "sort_order",
    },
  },
  {
    indexes: [{ fields: ["sort_order", "created_at"] }],
  }
);

module.exports = GalleryItem;
