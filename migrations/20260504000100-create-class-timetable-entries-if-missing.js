'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    let tableExists = true;
    try {
      await queryInterface.describeTable('class_timetable_entries');
    } catch (error) {
      tableExists = false;
    }

    if (tableExists) {
      return;
    }

    await queryInterface.createTable('class_timetable_entries', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      class_section_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'class_sections',
          key: 'id'
        },
        onUpdate: 'CASCADE',
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      subject_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'subjects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      teacher_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'teachers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
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
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addConstraint('class_timetable_entries', {
      fields: ['class_section_id', 'day_of_week', 'time_slot_id'],
      type: 'unique',
      name: 'uq_class_day_slot'
    });

    await queryInterface.addIndex('class_timetable_entries', ['teacher_id', 'day_of_week'], {
      name: 'idx_timetable_entries_teacher_day'
    });
  },

  async down(queryInterface) {
    let tableExists = true;
    try {
      await queryInterface.describeTable('class_timetable_entries');
    } catch (error) {
      tableExists = false;
    }

    if (!tableExists) {
      return;
    }

    await queryInterface.dropTable('class_timetable_entries');
  }
};
