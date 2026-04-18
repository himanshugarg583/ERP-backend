const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");

const NoticeTarget = sequelize.define('NoticeTarget',{
    id: {
      type: DataTypes.INTEGER(11),
      autoIncrement: true,
      primaryKey: true,
    },

    notice_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      references: {
        model: "notices",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    target_type: {
      type: DataTypes.ENUM(
        "all",
        "all_classes",
        "all_teachers",
        "all_staff",
        "class"
      ),
      allowNull: false,
    },

    class_section_id: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      references: {
        model: "class_sections",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  },
  {
    tableName: "notice_targets",
    timestamps: false,
  }
);

module.exports = {NoticeTarget};
