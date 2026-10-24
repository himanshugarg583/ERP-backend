'use strict';

async function tableExists(queryInterface, tableName) {
  const tablesRaw = await queryInterface.showAllTables();
  const tableNames = tablesRaw
    .map((table) => (typeof table === 'string' ? table : table.tableName || table.table_name))
    .filter(Boolean)
    .map((name) => String(name).toLowerCase());

  return tableNames.includes(String(tableName).toLowerCase());
}

async function indexExists(queryInterface, tableName, indexName) {
  if (!(await tableExists(queryInterface, tableName))) {
    return false;
  }

  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((index) => index.name === indexName);
}

module.exports = {
  async up(queryInterface) {
    if (await tableExists(queryInterface, 'results')) {
      if (!(await indexExists(queryInterface, 'results', 'idx_results_event_status_percentage'))) {
        await queryInterface.addIndex('results', ['exam_event_id', 'status', 'percentage'], {
          name: 'idx_results_event_status_percentage'
        });
      }
    }

    if (await tableExists(queryInterface, 'marks_entries')) {
      if (!(await indexExists(queryInterface, 'marks_entries', 'idx_marks_entries_student_updated'))) {
        await queryInterface.addIndex('marks_entries', ['student_id', 'updated_at'], {
          name: 'idx_marks_entries_student_updated'
        });
      }

      if (!(await indexExists(queryInterface, 'marks_entries', 'idx_marks_entries_paper_updated'))) {
        await queryInterface.addIndex('marks_entries', ['exam_paper_id', 'updated_at'], {
          name: 'idx_marks_entries_paper_updated'
        });
      }
    }
  },

  async down(queryInterface) {
    if ((await tableExists(queryInterface, 'results'))
      && (await indexExists(queryInterface, 'results', 'idx_results_event_status_percentage'))) {
      await queryInterface.removeIndex('results', 'idx_results_event_status_percentage');
    }

    if ((await tableExists(queryInterface, 'marks_entries'))
      && (await indexExists(queryInterface, 'marks_entries', 'idx_marks_entries_student_updated'))) {
      await queryInterface.removeIndex('marks_entries', 'idx_marks_entries_student_updated');
    }

    if ((await tableExists(queryInterface, 'marks_entries'))
      && (await indexExists(queryInterface, 'marks_entries', 'idx_marks_entries_paper_updated'))) {
      await queryInterface.removeIndex('marks_entries', 'idx_marks_entries_paper_updated');
    }
  }
};
