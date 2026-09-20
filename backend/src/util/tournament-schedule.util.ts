import { TournamentFormat } from '../models/tournament.model';

export interface ScheduledTournament {
  number: number;
  // YYYY-MM-DD
  date: string;
  format: TournamentFormat;
  timeControl: string;
  // Each section's rounds
  roundCounts: number[];
}

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

// A tournament played over more weeks than this beyond what its rounds need was not
// still running the whole time, so only the weeks its rounds need count
const SPARE_WEEKS = 2;

const toDate = (date: string): number => Date.parse(`${date}T00:00:00Z`);
const toIso = (time: number): string => new Date(time).toISOString().slice(0, 10);

// The minutes each player has for a game, from a time control such as "G40" or "G90+30"
function baseMinutes(timeControl: string): number {
  const hours = timeControl.match(/^(\d+) hours?$/);
  if (hours) {
    return Number(hours[1]) * 60;
  }
  return Number(timeControl.replace(/^G/, '').split('+')[0]);
}

// How many rounds the club fits into one evening for a time control
function roundsPerWeek({ format, timeControl }: ScheduledTournament): number {
  if (format === 'round-robin' || format === 'match') {
    return 1;
  }
  return baseMinutes(timeControl) >= 40 ? 2 : 3;
}

// The round count most sections play, since a section on its own schedule says nothing
// about the club's evenings
function typicalRounds(roundCounts: number[]): number {
  const counts = new Map<number, number>();
  for (const rounds of roundCounts) {
    counts.set(rounds, (counts.get(rounds) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}

// Blitz nights and simuls are over in an evening; anything slower runs for weeks
function weeksNeeded(tournament: ScheduledTournament): number {
  if (tournament.format === 'tandem-simul' || baseMinutes(tournament.timeControl) < 25) {
    return 1;
  }
  return Math.ceil(typicalRounds(tournament.roundCounts) / roundsPerWeek(tournament));
}

/**
 * The last day of each tournament, worked out from the club's calendar: a tournament
 * that runs for weeks keeps its weekday until the next tournament starts, so the free
 * weekdays before that start are its evenings, with a week or two spare for holidays.
 * Where the next tournament started before the rounds could have been played, the
 * evenings that no other tournament took continue past it. Tournaments starting the
 * same day, such as a championship and its finals, run together. A tournament over in
 * an evening has no end date.
 */
export function inferEndDates(
  tournaments: ScheduledTournament[],
): Map<number, string | null> {
  const starts = [...new Set(tournaments.map(({ date }) => date))].sort();
  const endDates = new Map<number, string | null>();

  for (const date of starts) {
    const block = tournaments.filter(tournament => tournament.date === date);
    const needed = Math.max(...block.map(weeksNeeded));
    if (needed <= 1) {
      block.forEach(({ number }) => endDates.set(number, null));
      continue;
    }

    const start = toDate(date);
    const nextStart = starts.filter(other => other > date).map(toDate)[0] ?? Infinity;
    const taken = new Set(starts.filter(other => other !== date).map(toDate));

    const free: number[] = [];
    for (let time = start; time < nextStart; time += WEEK) {
      free.push(time);
    }

    let end: number;
    if (free.length >= needed) {
      end = free.length > needed + SPARE_WEEKS ? free[needed - 1] : free[free.length - 1];
    } else {
      end = free[free.length - 1];
      let played = free.length;
      for (let time = end + WEEK; played < needed; time += WEEK) {
        if (!taken.has(time)) {
          end = time;
          played++;
        }
      }
    }

    block.forEach(({ number }) => endDates.set(number, end > start ? toIso(end) : null));
  }

  return endDates;
}
