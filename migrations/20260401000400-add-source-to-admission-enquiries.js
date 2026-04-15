'use strict';

async function resolveAdmissionEnquiriesTable(queryInterface) {
  const candidateNames = ['AdmissionEnquiries', 'admissionenquiries'];

  for (const tableName of candidateNames) {
    try {
      await queryInterface.describeTable(tableName);
      return tableName;
    } catch (error) {
      // Try next candidate.
    }
  }

  return 'AdmissionEnquiries';
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
