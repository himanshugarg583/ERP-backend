const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");

const Resource = sequelize.define(
  "Resource",
  {
    id: {
      type: DataTypes.INTEGER(11),
      autoIncrement: true,
      primaryKey: true,
    },

    resource_scope: {
      type: DataTypes.ENUM("class", "subject", "staff"),
      allowNull: false,
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    file_url: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    resource_type: {
      type: DataTypes.ENUM(
        "syllabus",
        "circular",
        "homework",
        "notes",
        "assignment",
        "worksheet",
        "question_paper",
        "notice",
        "policy",
        "meeting_minutes",
        "other"
      ),
      defaultValue: "other",
    },

    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    uploaded_by_type: {
      type: DataTypes.ENUM("teacher", "admin"),
      allowNull: false,
    },

    uploaded_by_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
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
    tableName: "resources",
    timestamps: false,
  }
);

module.exports = { Resource };
