'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    try {
      await queryInterface.dropTable('class_timetable_entries');
    } catch (error) {
      // Ignore if table does not exist.
    }

    try {
      await queryInterface.dropTable('class_time_slots');
    } catch (error) {
      // Ignore if table does not exist.
    }

    try {
      await queryInterface.dropTable('class_timetable_settings');
    } catch (error) {
      // Ignore if table does not exist.
    }

    try {
      await queryInterface.dropTable('class_timetables');
    } catch (error) {
      // Ignore if old table does not exist.
    }

    await queryInterface.createTable('class_timetable_settings', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      class_section_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'class_sections',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      start_time: {
        type: DataTypes.TIME,
        allowNull: false
      },
      end_time: {
        type: DataTypes.TIME,
        allowNull: false
      },
      period_duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      break_duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      break_after_period: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      working_days: {
        type: DataTypes.JSON,
        allowNull: false
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

    await queryInterface.createTable('class_time_slots', {
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
      slot_number: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      slot_label: {
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

    await queryInterface.addConstraint('class_time_slots', {
      fields: ['class_section_id', 'slot_number'],
      type: 'unique',
      name: 'uq_class_slot_number'
    });

    await queryInterface.addIndex('class_time_slots', ['class_section_id'], {
      name: 'idx_class_time_slots_class'
    });

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
        allowNull: false,
        references: {
          model: 'teachers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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

  async down(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.dropTable('class_timetable_entries');
    await queryInterface.dropTable('class_time_slots');
    await queryInterface.dropTable('class_timetable_settings');

    await queryInterface.createTable('class_timetables', {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  }
};
