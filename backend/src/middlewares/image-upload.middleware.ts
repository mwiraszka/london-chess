import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

const MAX_IMAGE_SIZE = 2.5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
}).fields([{ name: 'files', maxCount: 20 }]);

// Multer stops reading a file at the limit, so the size is reported from here
export function imageUpload(req: Request, res: Response, next: NextFunction): void {
  upload(req, res, error => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Each image must be under 2.5 MB.' });
      return;
    }
    next(error);
  });
}
