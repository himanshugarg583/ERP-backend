'use strict';

async function resolveAdmissionEnquiriesTable(queryInterface) {
  const candidateNames = ['admission_enquiries', 'admissionenquiries'];
  const existingTables = await queryInterface.showAllTables();
  const tableLookup = new Map(
    existingTables.map((tableName) => [String(tableName).toLowerCase(), tableName])
  );

  for (const candidateName of candidateNames) {
    const resolvedTableName = tableLookup.get(candidateName);
    if (resolvedTableName) {
      return resolvedTableName;
    }
  }

  return candidateNames[0];
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = await resolveAdmissionEnquiriesTable(queryInterface);
    const definition = await queryInterface.describeTable(tableName);

    if (!definition.source) {
      await queryInterface.addColumn(tableName, 'source', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableName = await resolveAdmissionEnquiriesTable(queryInterface);
    const definition = await queryInterface.describeTable(tableName);

    if (definition.source) {
      await queryInterface.removeColumn(tableName, 'source');
    }
  },
};
