import { NextFunction, Request, RequestHandler, Response } from 'express';

const MAX_IMAGE_SIZE = 2.5 * 1024 * 1024;

let upload: RequestHandler | undefined;

// Multer stops reading a file at the limit, so the size is reported from here
export async function imageUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Loaded on first use, so only an upload pays for it rather than every cold start
  const { default: multer } = await import('multer');
  upload ??= multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_SIZE },
  }).fields([{ name: 'files', maxCount: 20 }]);

  upload(req, res, error => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        message:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Each image must be under 2.5 MB.'
            : `${error.message}.`,
      });
      return;
    }
    next(error);
  });
}
