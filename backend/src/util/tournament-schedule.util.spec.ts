import { TournamentFormat } from '../models/tournament.model';
import { ScheduledTournament, inferEndDates } from './tournament-schedule.util';

const scheduled = (
  number: number,
  date: string,
  timeControl: string,
  roundCounts: number[],
  format: TournamentFormat = 'swiss',
): ScheduledTournament => ({ number, date, format, timeControl, roundCounts });

const blitz = (number: number, date: string) => scheduled(number, date, 'G10', [6]);

describe('inferEndDates', () => {
  it('should leave a blitz night or a simul with no end date', () => {
    const endDates = inferEndDates([
      blitz(1, '2025-05-01'),
      scheduled(2, '2025-05-08', '3 hours', [1], 'tandem-simul'),
      blitz(3, '2025-05-15'),
    ]);

    expect([...endDates.values()]).toEqual([null, null, null]);
  });

  it('should run a rapid over the free weeks before the next tournament', () => {
    const endDates = inferEndDates([
      blitz(1, '2025-06-26'),
      scheduled(2, '2025-07-03', 'G25', [9]),
      blitz(3, '2025-07-24'),
    ]);

    expect(endDates.get(2)).toBe('2025-07-17');
  });

  it('should allow a holiday week when the rounds ran over', () => {
    const endDates = inferEndDates([
      scheduled(1, '2022-12-08', 'G40', [6]),
      blitz(2, '2023-01-05'),
    ]);

    expect(endDates.get(1)).toBe('2022-12-29');
  });

  it('should count only the weeks the rounds need after a long break', () => {
    const endDates = inferEndDates([
      scheduled(1, '2020-02-13', 'G40', [6]),
      blitz(2, '2020-12-03'),
    ]);

    expect(endDates.get(1)).toBe('2020-02-27');
  });

  it('should continue past an evening another tournament took when the rounds were not done', () => {
    const endDates = inferEndDates([
      scheduled(1, '2019-10-24', 'G40', [6]),
      blitz(2, '2019-10-31'),
      scheduled(3, '2019-11-21', '3 hours', [1], 'tandem-simul'),
    ]);

    expect(endDates.get(1)).toBe('2019-11-14');
  });

  it('should run a championship a round a week, with its finals alongside', () => {
    const endDates = inferEndDates([
      scheduled(1, '2022-09-08', 'G85', [7, 7, 7, 7, 8, 8], 'round-robin'),
      scheduled(2, '2022-09-08', 'G85', [4, 2], 'match'),
      blitz(3, '2022-10-27'),
    ]);

    expect(endDates.get(1)).toBe('2022-10-20');
    expect(endDates.get(2)).toBe('2022-10-20');
  });

  it('should go by the rounds most sections play', () => {
    const endDates = inferEndDates([
      scheduled(1, '2025-09-18', 'G85', [5, 5, 5, 5, 3, 3, 7], 'round-robin'),
      blitz(2, '2025-10-16'),
      blitz(3, '2025-10-30'),
    ]);

    expect(endDates.get(1)).toBe('2025-10-23');
  });

  it('should have no end for the last tournament when it fits one evening', () => {
    expect(inferEndDates([blitz(1, '2026-09-10')]).get(1)).toBeNull();
  });
});
