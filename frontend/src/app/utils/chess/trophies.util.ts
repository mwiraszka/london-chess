import { trophy } from '@app/constants/tournaments';
import {
  MemberTournamentResult,
  Tournament,
  Trophy,
  TrophyMetal,
  TrophyShape,
} from '@app/models';

const METALS_BY_RANK: TrophyMetal[] = ['gold', 'silver', 'bronze'];

// A game of ten minutes or fewer per side, before any increment, is blitz
const BLITZ_MAX_MINUTES = 10;

function baseMinutes(timeControl: string): number {
  const hours = timeControl.match(/^(\d+) hours?$/);
  if (hours) {
    return Number(hours[1]) * 60;
  }
  return Number(timeControl.replace(/^G/, '').split('+')[0]);
}

// A qualifier is played for a place in the championship, not for the title
function isChampionship(name: string): boolean {
  return /championship/i.test(name) && !/qualifier/i.test(name);
}

export function trophyShapeFor(
  tournament: Pick<Tournament, 'name' | 'format' | 'timeControl'>,
): TrophyShape | null {
  // A simul board and a match between two players place no one on a podium
  if (tournament.format === 'tandem-simul' || tournament.format === 'match') {
    return null;
  }
  if (isChampionship(tournament.name)) {
    return 'bowl';
  }
  return baseMinutes(tournament.timeControl) <= BLITZ_MAX_MINUTES ? 'chalice' : 'cup';
}

// Null for anything but a podium finish
export function trophyForResult(result: MemberTournamentResult): Trophy | null {
  const metal = METALS_BY_RANK[result.rank - 1];
  const shape = trophyShapeFor(result.tournament);
  if (!metal || !shape) {
    return null;
  }
  // Only the champion's bowl exists, so the runners-up take the cup
  return trophy(shape === 'bowl' && metal !== 'gold' ? 'cup' : shape, metal);
}
