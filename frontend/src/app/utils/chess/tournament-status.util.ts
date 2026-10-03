import { pick } from 'lodash';
import moment from 'moment-timezone';

import { CLUB_TIME_ZONE } from '@app/constants/clubs';
import {
  INITIAL_TOURNAMENT_FORM_DATA,
  TOURNAMENT_FORM_DATA_PROPERTIES,
} from '@app/constants/tournaments';
import {
  RegistrationStatus,
  Tournament,
  TournamentFormData,
  TournamentSummary,
  TournamentTiming,
} from '@app/models';

export function clubToday(): string {
  return moment.tz(CLUB_TIME_ZONE).format('YYYY-MM-DD');
}

// What the tournament's form starts from: its recorded details, or a blank new tournament
export function tournamentFormData(tournament: Tournament | null): TournamentFormData {
  return tournament
    ? { ...pick(tournament, TOURNAMENT_FORM_DATA_PROPERTIES), sections: null, games: null }
    : INITIAL_TOURNAMENT_FORM_DATA;
}

export function registrationStatus(
  {
    registrationOpens,
    registrationCloses,
  }: Pick<Tournament, 'registrationOpens' | 'registrationCloses'>,
  now: Date = new Date(),
): RegistrationStatus {
  if (!registrationOpens || !registrationCloses) {
    return 'none';
  }
  const instant = now.toISOString();
  if (instant < registrationOpens) {
    return 'not-open';
  }
  return instant < registrationCloses ? 'open' : 'closed';
}

// Still to come, or under way with no results in yet
export function isUpcomingTournament(
  {
    date,
    endDate,
    playerCount,
  }: Pick<TournamentSummary, 'date' | 'endDate' | 'playerCount'>,
  today: string = clubToday(),
): boolean {
  return playerCount === 0 && (endDate ?? date) >= today;
}

// Null once the tournament's last day is behind the club
export function tournamentTiming(
  { date, endDate }: Pick<TournamentSummary, 'date' | 'endDate'>,
  today: string = clubToday(),
): TournamentTiming | null {
  if (date > today) {
    return 'upcoming';
  }
  return (endDate ?? date) >= today ? 'in-progress' : null;
}

// Members can withdraw up to the day the tournament starts, while no results are in
export function canWithdraw(
  { date, sections }: Pick<Tournament, 'date' | 'sections'>,
  today: string = clubToday(),
): boolean {
  return date >= today && sections.every(({ entries }) => !entries.length);
}
