import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { ApiErrorResponse } from '../models/api-response.model';

// Body parsing and upload errors carry the status and a message meant for the caller;
// anything else is reported to Sentry before it reaches here
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response<ApiErrorResponse>,
  next: NextFunction,
): void {
  // A response already under way can only be cut short, which Express's own handler does
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({ message: `${error.message}.` });
    return;
  }

  const status = statusOf(error);
  res.status(status).json({
    message: status < 500 && error instanceof Error ? error.message : 'Unknown error.',
  });
}

export function notFound(_req: Request, res: Response<ApiErrorResponse>): void {
  res.status(404).json({ message: 'Not found.' });
}

function statusOf(error: unknown): number {
  const status =
    error instanceof Error && 'status' in error && typeof error.status === 'number'
      ? error.status
      : 500;
  return status >= 400 && status < 600 ? status : 500;
}
