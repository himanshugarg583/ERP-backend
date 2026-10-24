'use strict';

async function tableExists(queryInterface, tableName) {
  const tablesRaw = await queryInterface.showAllTables();
  const tableNames = tablesRaw.map((t) => (typeof t === 'string' ? t : t.tableName || t.table_name)).filter(Boolean);
  return tableNames.map((name) => String(name).toLowerCase()).includes(String(tableName).toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    if (!(await tableExists(queryInterface, 'exam_types'))) {
      await queryInterface.createTable('exam_types', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        grading_config: {
          type: DataTypes.JSON,
          allowNull: false
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
    }

    if (!(await tableExists(queryInterface, 'exam_events'))) {
      await queryInterface.createTable('exam_events', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: DataTypes.STRING(150),
          allowNull: false
        },
        exam_type_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'exam_types',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        academic_year: {
          type: DataTypes.STRING(20),
          allowNull: false
        },
        start_date: {
          type: DataTypes.DATEONLY,
          allowNull: false
        },
        end_date: {
          type: DataTypes.DATEONLY,
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM('draft', 'scheduled', 'ongoing', 'completed', 'published'),
          allowNull: false,
          defaultValue: 'draft'
        },
        group_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        marks_entry_deadline: {
          type: DataTypes.DATE,
          allowNull: true
        },
        result_publish_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        created_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
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

      await queryInterface.addIndex('exam_events', ['exam_type_id', 'academic_year'], {
        name: 'idx_exam_events_type_year'
      });
      await queryInterface.addIndex('exam_events', ['status', 'start_date'], {
        name: 'idx_exam_events_status_dates'
      });
    }

    if (!(await tableExists(queryInterface, 'exam_papers'))) {
      await queryInterface.createTable('exam_papers', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        exam_event_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'exam_events',
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
        class_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'class_sections',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        max_marks: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: false
        },
        passing_marks: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: false
        },
        marks_config: {
          type: DataTypes.JSON,
          allowNull: false
        },
        assigned_teacher_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'teachers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
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

      await queryInterface.addConstraint('exam_papers', {
        fields: ['exam_event_id', 'subject_id', 'class_id'],
        type: 'unique',
        name: 'uq_exam_paper_event_subject_class'
      });
      await queryInterface.addIndex('exam_papers', ['assigned_teacher_id'], {
        name: 'idx_exam_papers_assigned_teacher'
      });
    }

    if (!(await tableExists(queryInterface, 'exam_timetable'))) {
      await queryInterface.createTable('exam_timetable', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        exam_event_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'exam_events',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        exam_paper_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: {
            model: 'exam_papers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        class_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'class_sections',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
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
        exam_date: {
          type: DataTypes.DATEONLY,
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
        duration_minutes: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        slot_number: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        room_label: {
          type: DataTypes.STRING(80),
          allowNull: true
        },
        invigilator_teacher_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'teachers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        is_rescheduled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        original_date: {
          type: DataTypes.DATEONLY,
          allowNull: true
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

      await queryInterface.addIndex('exam_timetable', ['exam_event_id', 'class_id', 'exam_date'], {
        name: 'idx_exam_timetable_event_class_date'
      });
    }

    if (!(await tableExists(queryInterface, 'marks_entries'))) {
      await queryInterface.createTable('marks_entries', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        exam_paper_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'exam_papers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        student_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'students',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        result_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        marks: {
          type: DataTypes.JSON,
          allowNull: true
        },
        marks_obtained: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: false,
          defaultValue: 0
        },
        total_marks: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: false,
          defaultValue: 0
        },
        max_marks: {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: false,
          defaultValue: 0
        },
        percentage: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0
        },
        grade: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: 'N/A'
        },
        is_pass: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        is_absent: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        is_exempt: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        entered_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        entered_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        meta_data: {
          type: DataTypes.JSON,
          allowNull: true
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

      await queryInterface.addConstraint('marks_entries', {
        fields: ['exam_paper_id', 'student_id'],
        type: 'unique',
        name: 'uq_marks_entry_paper_student'
      });
      await queryInterface.addIndex('marks_entries', ['exam_paper_id'], {
        name: 'idx_marks_entry_paper'
      });
      await queryInterface.addIndex('marks_entries', ['result_id'], {
        name: 'idx_marks_entry_result'
      });
    }

    if (!(await tableExists(queryInterface, 'exam_attendance'))) {
      await queryInterface.createTable('exam_attendance', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        exam_paper_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'exam_papers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        student_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'students',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        status: {
          type: DataTypes.ENUM('present', 'absent', 'late'),
          allowNull: false,
          defaultValue: 'present'
        },
        marked_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        marked_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        remarks: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        is_locked: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        malpractice_flag: {
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

      await queryInterface.addConstraint('exam_attendance', {
        fields: ['exam_paper_id', 'student_id'],
        type: 'unique',
        name: 'uq_exam_attendance_paper_student'
      });
    }

    if (!(await tableExists(queryInterface, 'results'))) {
      await queryInterface.createTable('results', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        student_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'students',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        exam_event_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'exam_events',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        total_marks: {
          type: DataTypes.DECIMAL(8, 2),
          allowNull: false,
          defaultValue: 0
        },
        max_marks: {
          type: DataTypes.DECIMAL(8, 2),
          allowNull: false,
          defaultValue: 0
        },
        percentage: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0
        },
        grade: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: 'N/A'
        },
        rank: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        is_pass: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        computed_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        published_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        status: {
          type: DataTypes.ENUM('draft', 'published', 'suppressed'),
          allowNull: false,
          defaultValue: 'draft'
        },
        version: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1
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

      await queryInterface.addConstraint('results', {
        fields: ['student_id', 'exam_event_id'],
        type: 'unique',
        name: 'uq_result_student_event'
      });
      await queryInterface.addIndex('results', ['exam_event_id', 'status'], {
        name: 'idx_result_event_status'
      });
    }

    if (!(await tableExists(queryInterface, 'document_templates'))) {
      await queryInterface.createTable('document_templates', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        document_type: {
          type: DataTypes.ENUM('admit_card', 'report_card', 'marksheet', 'tc', 'timetable_pdf'),
          allowNull: false
        },
        template_config: {
          type: DataTypes.JSON,
          allowNull: false
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
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

      await queryInterface.addIndex('document_templates', ['document_type', 'is_active'], {
        name: 'idx_document_templates_type_active'
      });
    }

    if (!(await tableExists(queryInterface, 'documents'))) {
      await queryInterface.createTable('documents', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        student_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'students',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        document_type: {
          type: DataTypes.ENUM('admit_card', 'report_card', 'marksheet', 'tc', 'timetable_pdf'),
          allowNull: false
        },
        reference_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        file_url: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        status: {
          type: DataTypes.ENUM('draft', 'final'),
          allowNull: false,
          defaultValue: 'draft'
        },
        version: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        meta_data: {
          type: DataTypes.JSON,
          allowNull: true
        },
        generated_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        generated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        is_valid: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
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

      await queryInterface.addIndex('documents', ['student_id', 'document_type', 'reference_id'], {
        name: 'idx_document_student_type_reference'
      });
      await queryInterface.addIndex('documents', ['reference_id', 'document_type'], {
        name: 'idx_document_reference_type'
      });
    }
  },

  async down(queryInterface) {
    const tables = [
      'documents',
      'document_templates',
      'results',
      'exam_attendance',
      'marks_entries',
      'exam_timetable',
      'exam_papers',
      'exam_events',
      'exam_types'
    ];

    for (const table of tables) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.dropTable(table);
      } catch (error) {
        // Ignore if missing.
      }
    }
  }
};
