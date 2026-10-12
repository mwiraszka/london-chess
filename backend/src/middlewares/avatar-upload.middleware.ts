import { NextFunction, Request, RequestHandler, Response } from 'express';

// With its cropped copy, a photo this size stays within Vercel's 4.5 MB request limit
const MAX_AVATAR_SIZE = 3 * 1024 * 1024;

let upload: RequestHandler | undefined;

// Multer stops reading a file at the limit, so the size is reported from here
export async function avatarUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Loaded on first use, so only an upload pays for it rather than every cold start
  const { default: multer } = await import('multer');
  upload ??= multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_AVATAR_SIZE },
  }).fields([
    { name: 'file', maxCount: 1 },
    { name: 'cropped', maxCount: 1 },
  ]);

  upload(req, res, error => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        message:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'File must be under 3 MB.'
            : `${error.message}.`,
      });
      return;
    }
    next(error);
  });
}
