const { DocumentV2 } = require('../../../models');

const buildSignedDocumentUrl = (fileUrl) => {
  if (!fileUrl) {
    return null;
  }

  const expiresAt = Date.now() + 15 * 60 * 1000;
  const separator = fileUrl.includes('?') ? '&' : '?';
  return `${fileUrl}${separator}signed=true&expires=${expiresAt}`;
};

const createDocumentRecord = async ({
  student_id,
  document_type,
  reference_id,
  file_url,
  generated_by,
  status = 'draft',
  meta_data = null
}) => {
  const existing = await DocumentV2.findOne({
    where: {
      student_id,
      document_type,
      reference_id,
      is_valid: true
    },
    order: [['version', 'DESC']]
  });

  if (!existing) {
    return DocumentV2.create({
      student_id,
      document_type,
      reference_id,
      file_url,
      generated_by,
      status,
      meta_data,
      version: 1
    });
  }

  existing.is_valid = false;
  await existing.save();

  return DocumentV2.create({
    student_id,
    document_type,
    reference_id,
    file_url,
    generated_by,
    status,
    meta_data,
    version: Number(existing.version || 1) + 1
  });
};

module.exports = {
  buildSignedDocumentUrl,
  createDocumentRecord
};
