import { Schema, model } from 'mongoose';

// When the database's records were last replaced wholesale, so a browser can tell that
// the records it saved came from an earlier set
interface Dataset {
  _id: string;
  replacedAt: string;
}

const datasetSchema = new Schema<Dataset>(
  {
    _id: { type: String, required: true },
    replacedAt: { type: String, required: true },
  },
  { versionKey: false },
);

export const DatasetModel = model<Dataset>('Dataset', datasetSchema);

export const CURRENT_DATASET_ID = 'current';
