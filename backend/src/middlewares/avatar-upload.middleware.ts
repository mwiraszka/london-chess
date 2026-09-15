import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
  },
});

export const avatarUpload = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cropped', maxCount: 1 },
]);
