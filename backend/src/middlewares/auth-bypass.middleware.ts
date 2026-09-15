import { NextFunction, Request, Response } from 'express';

import { ApiErrorResponse } from '../models/api-response.model';

/**
 * Bypass authentication middleware for offline development.
 */
export const bypassAuthenticate = (
  req: Request,
  res: Response<ApiErrorResponse>,
  next: NextFunction,
) => {
  // Set a mock admin user for offline development
  req.user = { id: 'offline-dev-user', sessionId: 'offline-dev-session', isAdmin: true };

  console.log('⚠️  AUTH BYPASS: Using mock authentication (offline mode)');
  next();
};
