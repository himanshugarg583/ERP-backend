const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createUploader = (subFolder, allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp','video/mp4', 'video/mkv', 'video/avi','application/pdf']) => {
  const uploadDir = path.join(__dirname, `../uploads/${subFolder}`);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  });


    const fileFilter = (req, file, cb) => {
    allowedTypes.includes(file.mimetype) 
      ? cb(null, true) 
      : cb(new Error('Invalid file type'));
  };

  return multer({ storage, fileFilter });
};

module.exports = createUploader;
