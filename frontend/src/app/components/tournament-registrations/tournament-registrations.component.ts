import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TournamentCardComponent } from '@app/components/tournament-card/tournament-card.component';
import { TournamentSummary } from '@app/models';
import { clubToday, registrationStatus, tournamentTiming } from '@app/utils';

/**
 * The tournaments still to come or under way that take registrations online, soonest
 * first, and nothing at all when none do.
 */
@Component({
  selector: 'lcc-tournament-registrations',
  templateUrl: './tournament-registrations.component.html',
  styleUrl: './tournament-registrations.component.scss',
  imports: [TournamentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[hidden]': '!isLoading() && !registrations().length',
  },
})
export class TournamentRegistrationsComponent {
  public readonly summaries = input.required<TournamentSummary[]>();
  public readonly isLoading = input(false);

  protected readonly registrations = computed<TournamentSummary[]>(() => {
    const today = clubToday();
    return this.summaries()
      .filter(
        summary =>
          tournamentTiming(summary, today) !== null &&
          registrationStatus(summary) !== 'none',
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number);
  });
}
