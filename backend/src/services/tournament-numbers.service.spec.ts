import { TournamentModel } from '../models/tournament.model';
import { useTestDatabase } from '../testing/database';
import { takeNextTournamentNumber } from './tournament-numbers.service';

async function createTournament(number: number): Promise<void> {
  await TournamentModel.create({
    number,
    name: 'Blitz',
    date: '2026-09-10',
    format: 'swiss',
    timeControl: 'G10',
    isRated: false,
    gameArchiveTournament: null,
    sections: [],
  });
}

describe('takeNextTournamentNumber', () => {
  useTestDatabase();

  it('should start at 1 when no tournament is recorded', async () => {
    await expect(takeNextTournamentNumber()).resolves.toBe(1);
  });

  it("should carry on past the club's highest recorded number", async () => {
    await createTournament(182);
    await createTournament(184);

    const first = await takeNextTournamentNumber();
    const second = await takeNextTournamentNumber();

    expect([first, second]).toEqual([185, 186]);
  });

  it('should never hand out the number of a deleted tournament again', async () => {
    await createTournament(184);
    const taken = await takeNextTournamentNumber();
    await TournamentModel.deleteMany({});

    const next = await takeNextTournamentNumber();

    expect(next).toBe(taken + 1);
  });
});
