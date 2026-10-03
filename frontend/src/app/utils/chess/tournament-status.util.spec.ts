import { INITIAL_TOURNAMENT_FORM_DATA } from '@app/constants/tournaments';
import {
  MOCK_TOURNAMENTS,
  MOCK_UPCOMING_SUMMARY,
  MOCK_UPCOMING_TOURNAMENT,
} from '@app/mocks/tournaments.mock';

import {
  canWithdraw,
  clubToday,
  isUpcomingTournament,
  registrationStatus,
  tournamentFormData,
  tournamentTiming,
} from './tournament-status.util';

describe('tournament status', () => {
  describe('clubToday', () => {
    it('should give the day on the club clock', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-16T03:00:00.000Z'));

      expect(clubToday()).toBe('2026-10-15');

      vi.useRealTimers();
    });
  });

  describe('tournamentFormData', () => {
    it("should take a tournament's details and keep its recorded results", () => {
      expect(tournamentFormData(MOCK_UPCOMING_TOURNAMENT)).toEqual({
        name: 'Fall Rapid',
        subtitle: '',
        date: '2050-10-15',
        endDate: '2050-10-29',
        format: 'swiss',
        timeControl: 'G25+5',
        isRated: true,
        articleId: null,
        registrationOpens: MOCK_UPCOMING_TOURNAMENT.registrationOpens,
        registrationCloses: MOCK_UPCOMING_TOURNAMENT.registrationCloses,
        sections: null,
        games: null,
      });
    });

    it('should start a new tournament blank', () => {
      expect(tournamentFormData(null)).toBe(INITIAL_TOURNAMENT_FORM_DATA);
    });
  });

  describe('registrationStatus', () => {
    const window = {
      registrationOpens: '2026-10-01T12:00:00.000Z',
      registrationCloses: '2026-10-15T21:00:00.000Z',
    };

    it('should follow the window from not yet open to closed', () => {
      expect(registrationStatus(window, new Date('2026-10-01T11:59:59.000Z'))).toBe(
        'not-open',
      );
      expect(registrationStatus(window, new Date('2026-10-01T12:00:00.000Z'))).toBe(
        'open',
      );
      expect(registrationStatus(window, new Date('2026-10-15T21:00:00.000Z'))).toBe(
        'closed',
      );
    });

    it('should have no status without a window', () => {
      expect(
        registrationStatus({ registrationOpens: null, registrationCloses: null }),
      ).toBe('none');
    });
  });

  describe('isUpcomingTournament', () => {
    it('should count a tournament without results until its last day', () => {
      const summary = {
        ...MOCK_UPCOMING_SUMMARY,
        date: '2026-10-15',
        endDate: '2026-10-29',
      };

      expect(isUpcomingTournament(summary, '2026-10-29')).toBe(true);
      expect(isUpcomingTournament(summary, '2026-10-30')).toBe(false);
      expect(isUpcomingTournament({ ...summary, endDate: null }, '2026-10-16')).toBe(
        false,
      );
    });

    it('should not count a tournament whose results are in', () => {
      expect(
        isUpcomingTournament({ ...MOCK_UPCOMING_SUMMARY, playerCount: 12 }, '2026-01-01'),
      ).toBe(false);
    });
  });

  describe('tournamentTiming', () => {
    const summary = { date: '2026-10-15', endDate: '2026-10-29' };

    it('should call a tournament upcoming until its first day', () => {
      expect(tournamentTiming(summary, '2026-10-14')).toBe('upcoming');
    });

    it('should call a tournament in progress from its first day through its last', () => {
      expect(tournamentTiming(summary, '2026-10-15')).toBe('in-progress');
      expect(tournamentTiming(summary, '2026-10-29')).toBe('in-progress');
      expect(tournamentTiming({ ...summary, endDate: null }, '2026-10-15')).toBe(
        'in-progress',
      );
    });

    it('should give nothing once the tournament is over', () => {
      expect(tournamentTiming(summary, '2026-10-30')).toBeNull();
      expect(tournamentTiming({ ...summary, endDate: null }, '2026-10-16')).toBeNull();
    });
  });

  describe('canWithdraw', () => {
    it('should allow withdrawing up to the first day while no results are in', () => {
      expect(canWithdraw(MOCK_UPCOMING_TOURNAMENT, '2050-10-15')).toBe(true);
      expect(canWithdraw(MOCK_UPCOMING_TOURNAMENT, '2050-10-16')).toBe(false);
      expect(
        canWithdraw({ ...MOCK_TOURNAMENTS[0], date: '2050-01-01' }, '2026-01-01'),
      ).toBe(false);
    });
  });
});
