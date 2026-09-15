import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2.5 * 1024 * 1024, // 2.5MB per file
  },
});

export const imageUpload = upload.fields([{ name: 'files', maxCount: 20 }]);
