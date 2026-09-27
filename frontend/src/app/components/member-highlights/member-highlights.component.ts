import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TOURNAMENT_FORMAT_LABELS } from '@app/constants/tournaments';
import { MemberTournamentResult, Trophy } from '@app/models';
import {
  formatDateRange,
  formatScore,
  shortenSubtitle,
  trophyForResult,
} from '@app/utils';

export interface TrophyEntry {
  id: string;
  trophy: Trophy;
  result: MemberTournamentResult;
  tournament: string;
  place: string;
  dateLabel: string;
  format: string;
  timeControl: string;
  scoreLabel: string;
  description: string;
}

const PLACES = ['1st', '2nd', '3rd'];

function toTrophyEntry(result: MemberTournamentResult): TrophyEntry | null {
  const trophy = trophyForResult(result);
  if (!trophy) {
    return null;
  }

  const { tournament } = result;
  const section = shortenSubtitle(result.section);
  const name = section ? `${tournament.name} (${section})` : tournament.name;
  const place = `${PLACES[result.rank - 1]} of ${result.playerCount}`;
  const dateLabel = formatDateRange(tournament.date, tournament.endDate);
  const format = TOURNAMENT_FORMAT_LABELS[tournament.format];
  const pointsOnOffer = result.roundCount * (result.isDoubleRound ? 2 : 1);

  return {
    id: `${tournament.number}-${result.section}`,
    trophy,
    result,
    tournament: name,
    place,
    dateLabel,
    format: tournament.isRated ? format : `${format} (unrated)`,
    timeControl: tournament.timeControl,
    scoreLabel: `${formatScore(result.score)} / ${pointsOnOffer}`,
    description: `${trophy.label}: ${place} in ${name}, ${dateLabel}`,
  };
}

// A member's podium finishes as trophies, rendering nothing for a member without any
@Component({
  selector: 'lcc-member-highlights',
  templateUrl: './member-highlights.component.html',
  styleUrl: './member-highlights.component.scss',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberHighlightsComponent {
  public readonly results = input.required<MemberTournamentResult[]>();

  // Newest first, as in the tournaments table
  protected readonly entries = computed<TrophyEntry[]>(() =>
    this.results()
      .map(toTrophyEntry)
      .filter((entry): entry is TrophyEntry => entry !== null)
      .sort((a, b) => b.result.tournament.date.localeCompare(a.result.tournament.date)),
  );

  // The newest trophy is selected until another is chosen
  protected readonly selectedId = linkedSignal<TrophyEntry[], string | null>({
    source: this.entries,
    computation: entries => entries[0]?.id ?? null,
  });

  protected readonly selected = computed(
    () => this.entries().find(entry => entry.id === this.selectedId()) ?? null,
  );

  public onSelect({ id }: TrophyEntry): void {
    this.selectedId.set(id);
  }
}
