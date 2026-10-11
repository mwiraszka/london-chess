import { Request, Response } from 'express';

import { ApiResponse } from '../models/api-response.model';
import { CURRENT_DATASET_ID, DatasetModel } from '../models/dataset.model';

export const dataset = async (
  _req: Request,
  res: Response<ApiResponse<{ replacedAt: string | null }>>,
) => {
  const current = await DatasetModel.findById(CURRENT_DATASET_ID).lean();
  res.status(200).json({ data: { replacedAt: current?.replacedAt ?? null } });
};
