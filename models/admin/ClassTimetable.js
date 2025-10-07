const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ClassTimetable = sequelize.define('class_timetables', {
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
    subject_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'subjects',
            key: 'id'
        },
        onDelete: 'SET NULL'
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
    day_of_week: {
        type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
        allowNull: false
    },
    period_name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    is_break: {
        type: DataTypes.BOOLEAN,
        defaultValue: 0
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
    timestamps: false,
    underscored: true
});

module.exports = { ClassTimetable };
