'use strict';

async function tableExists(queryInterface, tableName) {
  const tablesRaw = await queryInterface.showAllTables();
  const tableNames = tablesRaw
    .map((t) => (typeof t === 'string' ? t : t.tableName || t.table_name))
    .filter(Boolean)
    .map((name) => String(name).toLowerCase());
  return tableNames.includes(String(tableName).toLowerCase());
}

async function columnExists(queryInterface, tableName, columnName) {
  if (!(await tableExists(queryInterface, tableName))) {
    return false;
  }
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

async function indexExists(queryInterface, tableName, indexName) {
  if (!(await tableExists(queryInterface, tableName))) {
    return false;
  }
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((index) => index.name === indexName);
}

async function foreignKeyOnColumnExists(queryInterface, tableName, columnName) {
  if (!(await tableExists(queryInterface, tableName))) {
    return false;
  }
  const refs = await queryInterface.getForeignKeyReferencesForTable(tableName);
  return refs.some((ref) => {
    const sourceColumn = ref.columnName || ref.fromColumnName || ref.column_name;
    return sourceColumn === columnName;
  });
}

async function foreignKeyConstraintNamesForColumn(queryInterface, tableName, columnName) {
  if (!(await tableExists(queryInterface, tableName))) {
    return [];
  }
  const refs = await queryInterface.getForeignKeyReferencesForTable(tableName);
  return refs
    .filter((ref) => {
      const sourceColumn = ref.columnName || ref.fromColumnName || ref.column_name;
      return sourceColumn === columnName;
    })
    .map((ref) => ref.constraintName || ref.constraint_name)
    .filter(Boolean);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    if (await tableExists(queryInterface, 'marks_entries')) {
      if (!(await columnExists(queryInterface, 'marks_entries', 'result_id'))) {
        await queryInterface.addColumn('marks_entries', 'result_id', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'results',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
      }

      if (!(await columnExists(queryInterface, 'marks_entries', 'marks_obtained'))) {
        await queryInterface.addColumn('marks_entries', 'marks_obtained', {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: false,
          defaultValue: 0
        });
      }

      if (!(await columnExists(queryInterface, 'marks_entries', 'max_marks'))) {
        await queryInterface.addColumn('marks_entries', 'max_marks', {
          type: DataTypes.DECIMAL(6, 2),
          allowNull: false,
          defaultValue: 0
        });
      }

      if (!(await columnExists(queryInterface, 'marks_entries', 'percentage'))) {
        await queryInterface.addColumn('marks_entries', 'percentage', {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0
        });
      }

      if (!(await columnExists(queryInterface, 'marks_entries', 'grade'))) {
        await queryInterface.addColumn('marks_entries', 'grade', {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: 'N/A'
        });
      }

      if (!(await columnExists(queryInterface, 'marks_entries', 'is_pass'))) {
        await queryInterface.addColumn('marks_entries', 'is_pass', {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
      }

      if (!(await indexExists(queryInterface, 'marks_entries', 'idx_marks_entry_result'))) {
        await queryInterface.addIndex('marks_entries', ['result_id'], {
          name: 'idx_marks_entry_result'
        });
      }

      if ((await tableExists(queryInterface, 'results'))
        && !(await foreignKeyOnColumnExists(queryInterface, 'marks_entries', 'result_id'))) {
        await queryInterface.addConstraint('marks_entries', {
          fields: ['result_id'],
          type: 'foreign key',
          name: 'fk_marks_entries_result_id',
          references: {
            table: 'results',
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
      }
    }

    if ((await tableExists(queryInterface, 'marks_entries')) && (await tableExists(queryInterface, 'result_details'))) {
      await queryInterface.sequelize.query(`
        UPDATE marks_entries AS me
        INNER JOIN result_details AS rd
          ON rd.exam_paper_id = me.exam_paper_id
          AND rd.student_id = me.student_id
        SET
          me.result_id = rd.result_id,
          me.marks_obtained = rd.marks_obtained,
          me.max_marks = rd.max_marks,
          me.percentage = rd.percentage,
          me.grade = rd.grade,
          me.is_pass = rd.is_pass
      `);

      await queryInterface.dropTable('result_details');
    }
  },

  async down(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    if (!(await tableExists(queryInterface, 'result_details'))) {
      await queryInterface.createTable('result_details', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        result_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'results',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        exam_paper_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'exam_papers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
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
        marks_obtained: {
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

      await queryInterface.addConstraint('result_details', {
        fields: ['result_id', 'exam_paper_id'],
        type: 'unique',
        name: 'uq_result_details_result_paper'
      });
    }

    if ((await tableExists(queryInterface, 'marks_entries')) && (await tableExists(queryInterface, 'result_details'))) {
      await queryInterface.sequelize.query(`
        INSERT INTO result_details (
          result_id,
          exam_paper_id,
          student_id,
          marks_obtained,
          max_marks,
          percentage,
          grade,
          is_pass,
          created_at,
          updated_at
        )
        SELECT
          me.result_id,
          me.exam_paper_id,
          me.student_id,
          me.marks_obtained,
          me.max_marks,
          me.percentage,
          me.grade,
          me.is_pass,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM marks_entries AS me
        WHERE me.result_id IS NOT NULL
        ON DUPLICATE KEY UPDATE
          marks_obtained = VALUES(marks_obtained),
          max_marks = VALUES(max_marks),
          percentage = VALUES(percentage),
          grade = VALUES(grade),
          is_pass = VALUES(is_pass),
          updated_at = VALUES(updated_at)
      `);
    }

    if (await tableExists(queryInterface, 'marks_entries')) {
      const fkConstraintNames = await foreignKeyConstraintNamesForColumn(queryInterface, 'marks_entries', 'result_id');
      for (const constraintName of fkConstraintNames) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.removeConstraint('marks_entries', constraintName);
      }

      if (await indexExists(queryInterface, 'marks_entries', 'idx_marks_entry_result')) {
        await queryInterface.removeIndex('marks_entries', 'idx_marks_entry_result');
      }

      if (await columnExists(queryInterface, 'marks_entries', 'is_pass')) {
        await queryInterface.removeColumn('marks_entries', 'is_pass');
      }
      if (await columnExists(queryInterface, 'marks_entries', 'grade')) {
        await queryInterface.removeColumn('marks_entries', 'grade');
      }
      if (await columnExists(queryInterface, 'marks_entries', 'percentage')) {
        await queryInterface.removeColumn('marks_entries', 'percentage');
      }
      if (await columnExists(queryInterface, 'marks_entries', 'max_marks')) {
        await queryInterface.removeColumn('marks_entries', 'max_marks');
      }
      if (await columnExists(queryInterface, 'marks_entries', 'marks_obtained')) {
        await queryInterface.removeColumn('marks_entries', 'marks_obtained');
      }
      if (await columnExists(queryInterface, 'marks_entries', 'result_id')) {
        await queryInterface.removeColumn('marks_entries', 'result_id');
      }
    }
  }
};