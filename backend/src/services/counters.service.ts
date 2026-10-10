import { CounterModel } from '../models/counter.model';

// The counter starts past every number already taken, so the club's numbering carries on,
// and never goes back, so a deleted record's number is never handed out again
export async function takeNextNumber(
  counterId: string,
  highestTaken: number,
): Promise<number> {
  await CounterModel.updateOne(
    { _id: counterId },
    { $max: { next: highestTaken + 1 } },
    { upsert: true },
  );
  const counter = await CounterModel.findOneAndUpdate(
    { _id: counterId },
    { $inc: { next: 1 } },
  ).lean();

  if (!counter) {
    throw new Error(`The ${counterId} counter could not be read.`);
  }
  return counter.next;
}
