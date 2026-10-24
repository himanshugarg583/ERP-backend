'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('resources', {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      resource_scope: {
        type: Sequelize.ENUM('class', 'subject', 'staff'),
        allowNull: false,
      },
      class_section_id: {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'class_sections',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      subject_id: {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'subjects',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      file_url: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      resource_type: {
        type: Sequelize.ENUM(
          'syllabus',
          'circular',
          'homework',
          'notes',
          'assignment',
          'worksheet',
          'question_paper',
          'notice',
          'policy',
          'meeting_minutes',
          'other'
        ),
        allowNull: false,
        defaultValue: 'other',
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      uploaded_by_type: {
        type: Sequelize.ENUM('teacher', 'admin'),
        allowNull: false,
      },
      uploaded_by_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('resources', ['resource_scope']);
    await queryInterface.addIndex('resources', ['class_section_id']);
    await queryInterface.addIndex('resources', ['subject_id']);

    const [classTableExists] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'class_resources';"
    );

    if (classTableExists[0].count > 0) {
      await queryInterface.sequelize.query(`
        INSERT INTO resources (
          resource_scope,
          class_section_id,
          subject_id,
          title,
          description,
          file_url,
          resource_type,
          due_date,
          uploaded_by_type,
          uploaded_by_id,
          created_at,
          updated_at
        )
        SELECT
          'class' AS resource_scope,
          cr.class_section_id,
          NULL AS subject_id,
          cr.title,
          cr.description,
          cr.file_url,
          CASE
            WHEN cr.resource_type IN ('syllabus', 'circular', 'homework', 'other') THEN cr.resource_type
            ELSE 'other'
          END AS resource_type,
          NULL AS due_date,
          CASE WHEN cr.teacher_id IS NULL THEN 'admin' ELSE 'teacher' END AS uploaded_by_type,
          COALESCE(cr.teacher_id, 0) AS uploaded_by_id,
          cr.created_at,
          cr.updated_at
        FROM class_resources cr;
      `);
    }

    const [subjectTableExists] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'subject_resources';"
    );

    if (subjectTableExists[0].count > 0) {
      await queryInterface.sequelize.query(`
        INSERT INTO resources (
          resource_scope,
          class_section_id,
          subject_id,
          title,
          description,
          file_url,
          resource_type,
          due_date,
          uploaded_by_type,
          uploaded_by_id,
          created_at,
          updated_at
        )
        SELECT
          'subject' AS resource_scope,
          sr.class_section_id,
          sr.subject_id,
          sr.title,
          sr.description,
          sr.file_url,
          CASE
            WHEN sr.resource_type IN ('notes', 'assignment', 'worksheet', 'question_paper', 'other') THEN sr.resource_type
            ELSE 'other'
          END AS resource_type,
          sr.due_date,
          CASE WHEN sr.teacher_id IS NULL THEN 'admin' ELSE 'teacher' END AS uploaded_by_type,
          COALESCE(sr.teacher_id, 0) AS uploaded_by_id,
          sr.created_at,
          sr.updated_at
        FROM subject_resources sr;
      `);
    }

    await queryInterface.createTable('audience_targets', {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      notice_id: {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'notices',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      resource_id: {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'resources',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      target_type: {
        type: Sequelize.ENUM('all', 'all_classes', 'all_teachers', 'all_staff', 'class', 'individual'),
        allowNull: false,
      },
      class_section_id: {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'class_sections',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      individual_type: {
        type: Sequelize.ENUM('teacher', 'staff'),
        allowNull: true,
      },
      individual_id: {
        type: Sequelize.INTEGER(11),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('audience_targets', ['notice_id']);
    await queryInterface.addIndex('audience_targets', ['resource_id']);

    const [noticeTargetExists] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'notice_targets';"
    );

    if (noticeTargetExists[0].count > 0) {
      await queryInterface.sequelize.query(`
        INSERT INTO audience_targets (
          notice_id,
          resource_id,
          target_type,
          class_section_id,
          individual_type,
          individual_id,
          created_at
        )
        SELECT
          nt.notice_id,
          NULL AS resource_id,
          nt.target_type,
          nt.class_section_id,
          NULL AS individual_type,
          NULL AS individual_id,
          CURRENT_TIMESTAMP AS created_at
        FROM notice_targets nt;
      `);

      await queryInterface.dropTable('notice_targets');
    }

    if (classTableExists[0].count > 0) {
      await queryInterface.dropTable('class_resources');
    }

    if (subjectTableExists[0].count > 0) {
      await queryInterface.dropTable('subject_resources');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('class_resources', {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      class_section_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
          model: 'class_sections',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      file_url: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      resource_type: {
        type: Sequelize.ENUM('syllabus', 'circular', 'homework', 'other'),
        defaultValue: 'other',
      },
      teacher_id: {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'teachers',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('subject_resources', {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      class_section_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
          model: 'class_sections',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      subject_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
          model: 'subjects',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      file_url: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      resource_type: {
        type: Sequelize.ENUM('notes', 'assignment', 'worksheet', 'question_paper', 'other'),
        defaultValue: 'other',
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      teacher_id: {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'teachers',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('notice_targets', {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      notice_id: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        references: {
          model: 'notices',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      target_type: {
        type: Sequelize.ENUM('all', 'all_classes', 'all_teachers', 'all_staff', 'class'),
        allowNull: false,
      },
      class_section_id: {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'class_sections',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    });

    await queryInterface.sequelize.query(`
      INSERT INTO class_resources (
        class_section_id,
        title,
        description,
        file_url,
        resource_type,
        teacher_id,
        created_at,
        updated_at
      )
      SELECT
        r.class_section_id,
        r.title,
        r.description,
        r.file_url,
        CASE
          WHEN r.resource_type IN ('syllabus', 'circular', 'homework', 'other') THEN r.resource_type
          ELSE 'other'
        END AS resource_type,
        CASE WHEN r.uploaded_by_type = 'teacher' THEN r.uploaded_by_id ELSE NULL END AS teacher_id,
        r.created_at,
        r.updated_at
      FROM resources r
      WHERE r.resource_scope = 'class';
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO subject_resources (
        class_section_id,
        subject_id,
        title,
        description,
        file_url,
        resource_type,
        due_date,
        teacher_id,
        created_at,
        updated_at
      )
      SELECT
        r.class_section_id,
        r.subject_id,
        r.title,
        r.description,
        r.file_url,
        CASE
          WHEN r.resource_type IN ('notes', 'assignment', 'worksheet', 'question_paper', 'other') THEN r.resource_type
          ELSE 'other'
        END AS resource_type,
        r.due_date,
        CASE WHEN r.uploaded_by_type = 'teacher' THEN r.uploaded_by_id ELSE NULL END AS teacher_id,
        r.created_at,
        r.updated_at
      FROM resources r
      WHERE r.resource_scope = 'subject';
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO notice_targets (
        notice_id,
        target_type,
        class_section_id
      )
      SELECT
        at.notice_id,
        CASE
          WHEN at.target_type IN ('all', 'all_classes', 'all_teachers', 'all_staff', 'class') THEN at.target_type
          ELSE 'all'
        END AS target_type,
        at.class_section_id
      FROM audience_targets at
      WHERE at.notice_id IS NOT NULL;
    `);

    await queryInterface.dropTable('audience_targets');
    await queryInterface.dropTable('resources');
  },
};
