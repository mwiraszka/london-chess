import { omit, pick } from 'lodash-es';

import { CLUB_TIME_ZONE } from '@app/constants/clubs';
import {
  INITIAL_TOURNAMENT_FORM_DATA,
  TOURNAMENT_FORM_DATA_PROPERTIES,
} from '@app/constants/tournaments';
import {
  ModificationInfo,
  RegistrationStatus,
  Tournament,
  TournamentFormData,
  TournamentInput,
  TournamentSummary,
  TournamentTiming,
} from '@app/models';
import moment from '@app/utils/datetime/moment';

export function clubToday(): string {
  return moment.tz(CLUB_TIME_ZONE).format('YYYY-MM-DD');
}

// What the tournament's form starts from: its recorded details, or a blank new tournament
export function tournamentFormData(tournament: Tournament | null): TournamentFormData {
  return tournament
    ? {
        ...pick(tournament, TOURNAMENT_FORM_DATA_PROPERTIES),
        sections: null,
        games: null,
      }
    : INITIAL_TOURNAMENT_FORM_DATA;
}

// Drafts are kept between visits, so one an older version of the form saved can hold
// fields the API no longer takes; only the form's own go out
export function tournamentInput(
  formData: TournamentFormData,
  modificationInfo: ModificationInfo,
): TournamentInput {
  return {
    ...pick(formData, TOURNAMENT_FORM_DATA_PROPERTIES),
    sections: formData.sections,
    games: formData.games,
    modificationInfo,
  };
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
  { date, playerCount }: Pick<TournamentSummary, 'date' | 'playerCount'>,
  today: string = clubToday(),
): boolean {
  return date >= today && playerCount === 0;
}

// The tournament as the list of tournaments summarises it
export function summarizeTournament(tournament: Tournament): TournamentSummary {
  return {
    ...omit(tournament, ['sections', 'modificationInfo']),
    sections: tournament.sections.map(
      ({ name, ratingBand, roundCount, entries, games }) => ({
        name,
        ratingBand,
        roundCount,
        entryCount: entries.length,
        hasRounds: entries.some(({ rounds }) => rounds.length),
        gameCount: games.length,
      }),
    ),
    // A player entered in two sections is still one player
    playerCount: new Set(
      tournament.sections.flatMap(({ entries }) =>
        entries.map(({ player }) => player.id),
      ),
    ).size,
  };
}
