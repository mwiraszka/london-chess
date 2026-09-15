import { NextFunction, Request, Response } from 'express';

export const logger = (req: Request, _res: Response, next: NextFunction) => {
  const message = `[LCC] ${req.method} request to ${req.url}`;
  if (req.body) {
    message.concat(` with params ${JSON.stringify(req.body)}`);
  }
  console.info(message);
  next();
};
