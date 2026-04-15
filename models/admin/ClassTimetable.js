const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ClassTimetable = sequelize.define('ClassTimetable', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    class_section_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'class_sections',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    day_of_week: {
        type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
        allowNull: false
    },
    time_slot_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'class_time_slots',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'subjects',
            key: 'id'
        },
        onDelete: 'RESTRICT'
    },
    teacher_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'teachers',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    notes: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    is_break: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'class_timetable_entries',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['class_section_id', 'day_of_week', 'time_slot_id'],
            name: 'uq_class_day_slot'
        }
    ]
});

module.exports = { ClassTimetable };
