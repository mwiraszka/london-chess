import { Request, Response } from 'express';

import { ApiResponse } from '../models/api-response.model';

export const helloWorld = (_req: Request, res: Response<ApiResponse<string>>) => {
  res.status(200).json({ data: 'Hello, World! 😎 [LCC API v1]' });
};
