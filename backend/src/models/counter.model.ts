import { Schema, model } from 'mongoose';

export interface Counter {
  _id: string;
  next: number;
}

const counterSchema = new Schema<Counter>(
  {
    _id: { type: String, required: true },
    next: { type: Number, required: true },
  },
  { versionKey: false },
);

export const CounterModel = model<Counter>('Counter', counterSchema);

export const MEMBER_NUMBER_COUNTER_ID = 'memberNumber';
