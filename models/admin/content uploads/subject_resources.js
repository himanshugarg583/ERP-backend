const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");

const SubjectResource = sequelize.define('SubjectResource',{
    id: {
      type: DataTypes.INTEGER(11),
      autoIncrement: true,
      primaryKey: true,
    },

    class_section_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      references: {
        model: "class_sections", // table name
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    subject_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      references: {
        model: "subjects", // table name
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
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
        "notes",
        "assignment",
        "worksheet",
        "question_paper",
        "other"
      ),
      defaultValue: "other",
    },

    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    teacher_id: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
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
    tableName: "subject_resources",
    timestamps: false,
  }
);

module.exports = { SubjectResource };
    