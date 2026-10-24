'use strict';

const hasIndex = (indexes, columns) => {
  const expected = columns.join(',');
  return indexes.some((index) => {
    const actual = index.fields.map((field) => field.attribute).join(',');
    return actual === expected;
  });
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const audienceTable = 'audience_targets';
    const resourceTable = 'resources';

    const addIndexIfMissing = async (tableName, columns, name) => {
      const indexes = await queryInterface.showIndex(tableName);
      if (!hasIndex(indexes, columns)) {
        await queryInterface.addIndex(tableName, columns, { name });
      }
    };

    const removeIndexIfPresent = async (tableName, columns) => {
      const indexes = await queryInterface.showIndex(tableName);
      const expected = columns.join(',');
      const target = indexes.find((index) => index.fields.map((field) => field.attribute).join(',') === expected);
      if (target) {
        await queryInterface.removeIndex(tableName, target.name);
      }
    };

    const dropForeignKeyIfExists = async (tableName, columnName) => {
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${tableName}'
          AND COLUMN_NAME = '${columnName}'
          AND REFERENCED_TABLE_NAME IS NOT NULL;
      `);

      for (const constraint of constraints) {
        await queryInterface.removeConstraint(tableName, constraint.CONSTRAINT_NAME);
      }
    };

    const audienceDescription = await queryInterface.describeTable(audienceTable);
    if (!audienceDescription.subject_id) {
      await queryInterface.addColumn(audienceTable, 'subject_id', {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'subjects',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    await addIndexIfMissing(audienceTable, ['subject_id'], 'idx_audience_targets_subject_id');
    await addIndexIfMissing(
      audienceTable,
      ['resource_id', 'class_section_id', 'subject_id'],
      'idx_audience_targets_resource_class_subject'
    );

    await queryInterface.sequelize.query(`
      INSERT INTO audience_targets (
        notice_id,
        resource_id,
        target_type,
        class_section_id,
        subject_id,
        individual_type,
        individual_id,
        created_at
      )
      SELECT
        NULL AS notice_id,
        r.id AS resource_id,
        'class' AS target_type,
        r.class_section_id,
        r.subject_id,
        NULL AS individual_type,
        NULL AS individual_id,
        COALESCE(r.created_at, CURRENT_TIMESTAMP) AS created_at
      FROM resources r
      WHERE r.class_section_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM audience_targets at
          WHERE at.resource_id = r.id
            AND at.target_type = 'class'
            AND at.class_section_id <=> r.class_section_id
            AND at.subject_id <=> r.subject_id
        );
    `);

    const resourcesDescription = await queryInterface.describeTable(resourceTable);

    if (resourcesDescription.class_section_id) {
      await dropForeignKeyIfExists(resourceTable, 'class_section_id');
      await removeIndexIfPresent(resourceTable, ['class_section_id']);
      await queryInterface.removeColumn(resourceTable, 'class_section_id');
    }

    if (resourcesDescription.subject_id) {
      await dropForeignKeyIfExists(resourceTable, 'subject_id');
      await removeIndexIfPresent(resourceTable, ['subject_id']);
      await queryInterface.removeColumn(resourceTable, 'subject_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const audienceTable = 'audience_targets';
    const resourceTable = 'resources';

    const addIndexIfMissing = async (tableName, columns, name) => {
      const indexes = await queryInterface.showIndex(tableName);
      if (!hasIndex(indexes, columns)) {
        await queryInterface.addIndex(tableName, columns, { name });
      }
    };

    const removeIndexByNameIfPresent = async (tableName, indexName) => {
      const indexes = await queryInterface.showIndex(tableName);
      if (indexes.some((index) => index.name === indexName)) {
        await queryInterface.removeIndex(tableName, indexName);
      }
    };

    const resourcesDescription = await queryInterface.describeTable(resourceTable);

    if (!resourcesDescription.class_section_id) {
      await queryInterface.addColumn(resourceTable, 'class_section_id', {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'class_sections',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    if (!resourcesDescription.subject_id) {
      await queryInterface.addColumn(resourceTable, 'subject_id', {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        references: {
          model: 'subjects',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    await addIndexIfMissing(resourceTable, ['class_section_id'], 'resources_class_section_id');
    await addIndexIfMissing(resourceTable, ['subject_id'], 'resources_subject_id');

    await queryInterface.sequelize.query(`
      UPDATE resources r
      INNER JOIN (
        SELECT at.resource_id, MIN(at.id) AS min_target_id
        FROM audience_targets at
        WHERE at.resource_id IS NOT NULL
          AND at.target_type = 'class'
        GROUP BY at.resource_id
      ) x ON x.resource_id = r.id
      INNER JOIN audience_targets at ON at.id = x.min_target_id
      SET
        r.class_section_id = at.class_section_id,
        r.subject_id = at.subject_id;
    `);

    const audienceDescription = await queryInterface.describeTable(audienceTable);
    if (audienceDescription.subject_id) {
      await removeIndexByNameIfPresent(audienceTable, 'idx_audience_targets_resource_class_subject');
      await removeIndexByNameIfPresent(audienceTable, 'idx_audience_targets_subject_id');
      await queryInterface.removeColumn(audienceTable, 'subject_id');
    }
  },
};
