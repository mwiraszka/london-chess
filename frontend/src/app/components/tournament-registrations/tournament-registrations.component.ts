import {
  ButtonLinkComponent,
  CardComponent,
  SkeletonComponent,
  TooltipDirective,
} from '@eagami/ui';
import { map, timer } from 'rxjs';

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { RegistrationStatus, TournamentSummary } from '@app/models';
import {
  clubToday,
  countdownLabel,
  formatDateRange,
  registrationStatus,
  tournamentTiming,
} from '@app/utils';

interface Registration {
  summary: TournamentSummary;
  dateLabel: string;
  status: Exclude<RegistrationStatus, 'none'>;
  opensIn: string | null;
}

/**
 * The tournaments still to come or under way that take registrations online, each with
 * a way to register or a countdown to when it can, and otherwise one way into the
 * tournaments.
 */
@Component({
  selector: 'lcc-tournament-registrations',
  templateUrl: './tournament-registrations.component.html',
  styleUrl: './tournament-registrations.component.scss',
  imports: [
    ButtonLinkComponent,
    CardComponent,
    RouterLink,
    SkeletonComponent,
    TextSkeletonComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentRegistrationsComponent {
  public readonly summaries = input.required<TournamentSummary[]>();
  public readonly isLoading = input(false);

  // Each half minute, so the countdowns keep up and a registration opens on time
  private readonly now = toSignal(timer(0, 30_000).pipe(map(() => new Date())), {
    initialValue: new Date(),
  });

  protected readonly registrations = computed<Registration[]>(() => {
    const now = this.now();
    const today = clubToday();
    return this.summaries()
      .filter(summary => tournamentTiming(summary, today) !== null)
      .map(summary => ({ summary, status: registrationStatus(summary, now) }))
      .filter(
        (item): item is { summary: TournamentSummary; status: Registration['status'] } =>
          item.status !== 'none',
      )
      .sort(
        (a, b) =>
          a.summary.date.localeCompare(b.summary.date) ||
          a.summary.number - b.summary.number,
      )
      .map(({ summary, status }) => ({
        summary,
        status,
        dateLabel: formatDateRange(summary.date, summary.endDate, 'short'),
        opensIn:
          status === 'not-open' && summary.registrationOpens
            ? countdownLabel(Date.parse(summary.registrationOpens) - now.getTime())
            : null,
      }));
  });
}
