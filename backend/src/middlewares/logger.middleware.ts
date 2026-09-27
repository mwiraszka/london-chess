import { NextFunction, Request, Response } from 'express';

// Bodies carry passwords and member details, so only the request line is logged
export const logger = (req: Request, _res: Response, next: NextFunction) => {
  console.info(`[LCC] ${req.method} request to ${req.url}`);
  next();
};
