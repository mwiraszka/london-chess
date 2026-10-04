import { CounterModel, TOURNAMENT_NUMBER_COUNTER_ID } from '../models/counter.model';
import { TournamentModel } from '../models/tournament.model';

// The counter starts past every stored number, so the club's numbering carries on, and a
// deleted tournament's number is never handed out again
export async function takeNextTournamentNumber(): Promise<number> {
  const [latest] = await TournamentModel.find({}, { number: 1 })
    .sort({ number: -1 })
    .limit(1)
    .lean<{ number: number }[]>();

  await CounterModel.updateOne(
    { _id: TOURNAMENT_NUMBER_COUNTER_ID },
    { $max: { next: (latest?.number ?? 0) + 1 } },
    { upsert: true },
  );
  const counter = await CounterModel.findOneAndUpdate(
    { _id: TOURNAMENT_NUMBER_COUNTER_ID },
    { $inc: { next: 1 } },
  ).lean();

  if (!counter) {
    throw new Error('The tournament number counter could not be read.');
  }
  return counter.next;
}
