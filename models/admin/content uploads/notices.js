const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");

const Notice = sequelize.define('Notice',{
    id: {
      type: DataTypes.INTEGER(11),
      autoIncrement: true,
      primaryKey: true,
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    attachment: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    created_by: {
      type: DataTypes.INTEGER(11),
      allowNull: true, // NULL = admin
      references: {
        model: "teachers",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "notices",
    timestamps: false,
  }
);

module.exports = {Notice};
