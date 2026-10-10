import { TOURNAMENT_NUMBER_COUNTER_ID } from '../models/counter.model';
import { TournamentModel } from '../models/tournament.model';
import { takeNextNumber } from './counters.service';

export async function takeNextTournamentNumber(): Promise<number> {
  const [latest] = await TournamentModel.find({}, { number: 1 })
    .sort({ number: -1 })
    .limit(1)
    .lean<{ number: number }[]>();
  return takeNextNumber(TOURNAMENT_NUMBER_COUNTER_ID, latest?.number ?? 0);
}
