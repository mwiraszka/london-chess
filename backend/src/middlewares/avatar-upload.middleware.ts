import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_SIZE },
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'cropped', maxCount: 1 },
]);

// Multer stops reading a file at the limit, so the size is reported from here
export function avatarUpload(req: Request, res: Response, next: NextFunction): void {
  upload(req, res, error => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'File must be under 5 MB.' });
      return;
    }
    next(error);
  });
}
