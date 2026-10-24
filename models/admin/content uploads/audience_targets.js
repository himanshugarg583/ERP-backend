const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");

const AudienceTarget = sequelize.define(
  "AudienceTarget",
  {
    id: {
      type: DataTypes.INTEGER(11),
      autoIncrement: true,
      primaryKey: true,
    },

    notice_id: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      references: {
        model: "notices",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    resource_id: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      references: {
        model: "resources",
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
        "class",
        "individual"
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

    subject_id: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      references: {
        model: "subjects",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    individual_type: {
      type: DataTypes.ENUM("teacher", "staff"),
      allowNull: true,
    },

    individual_id: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "audience_targets",
    timestamps: false,
    indexes: [
      { fields: ["notice_id"] },
      { fields: ["resource_id"] },
      { fields: ["subject_id"] },
      { fields: ["resource_id", "class_section_id", "subject_id"] },
    ],
    validate: {
      validateTargetSource() {
        const hasNoticeId = this.notice_id !== null && this.notice_id !== undefined;
        const hasResourceId = this.resource_id !== null && this.resource_id !== undefined;

        if (hasNoticeId === hasResourceId) {
          throw new Error("Exactly one of notice_id or resource_id must be provided");
        }
      },
      validateTargetShape() {
        if (this.target_type === "class" && !this.class_section_id) {
          throw new Error("class_section_id is required when target_type is class");
        }

        if (this.subject_id && !this.class_section_id) {
          throw new Error("class_section_id is required when subject_id is provided");
        }

        if (this.target_type === "individual") {
          if (!this.individual_type || !this.individual_id) {
            throw new Error(
              "individual_type and individual_id are required when target_type is individual"
            );
          }

          if (this.class_section_id || this.subject_id) {
            throw new Error(
              "class_section_id and subject_id must be null when target_type is individual"
            );
          }
        }
      },
    },
  }
);

module.exports = { AudienceTarget };
