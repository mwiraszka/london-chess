import { Request, Response } from 'express';

import { ApiResponse } from '../models/api-response.model';
import { getVersion } from '../util/get-version.util';

export const version = (_req: Request, res: Response<ApiResponse<string>>) => {
  res.status(200).json({ data: getVersion() });
};
