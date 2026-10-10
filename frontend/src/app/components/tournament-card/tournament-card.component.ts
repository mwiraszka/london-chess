import {
  ButtonLinkComponent,
  CardComponent,
  DividerComponent,
  TooltipDirective,
} from '@eagami/ui';
import { defer, map, repeat, timer } from 'rxjs';

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { TOURNAMENT_FORMAT_LABELS } from '@app/constants/tournaments';
import { RegistrationStatus, TournamentSummary } from '@app/models';
import {
  CountdownPart,
  countdownParts,
  describeCountdown,
  formatDateRange,
  registrationStatus,
} from '@app/utils';

interface CardRegistration {
  status: Exclude<RegistrationStatus, 'none'>;
  label: string;
  countdown: CountdownPart[];
  description: string;
}

const REGISTRATION_LABELS: Record<CardRegistration['status'], string> = {
  'not-open': 'Registration opens in',
  open: 'Registration closes in',
  closed: 'Registration',
};

// Each turn of the clock's second hand, aimed afresh every time so the ticks never drift
// off it
const SECOND_TICKS = defer(() => timer(1000 - (Date.now() % 1000))).pipe(repeat());

/**
 * A tournament still to come: its name, its details, and where its online registration
 * stands, counted down to the second.
 */
@Component({
  selector: 'lcc-tournament-card',
  templateUrl: './tournament-card.component.html',
  styleUrl: './tournament-card.component.scss',
  imports: [
    ButtonLinkComponent,
    CardComponent,
    DividerComponent,
    RouterLink,
    TextSkeletonComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentCardComponent {
  // Null while the tournaments load, for a placeholder in the card's own shape
  public readonly summary = input.required<TournamentSummary | null>();
  // Kept to one line and cut short, so the card is as tall as its placeholder whatever
  // its details turn out to be
  public readonly detailsOnOneLine = input(false);

  private readonly now = toSignal(SECOND_TICKS.pipe(map(() => new Date())), {
    initialValue: new Date(),
  });

  protected readonly details = computed<string[]>(() => {
    const summary = this.summary();
    if (!summary) {
      return [];
    }
    const registered = summary.registrants.length;
    return [
      formatDateRange(summary.date, summary.endDate, 'short'),
      TOURNAMENT_FORMAT_LABELS[summary.format],
      summary.timeControl,
      registered
        ? `${registered} ${registered === 1 ? 'player' : 'players'} registered`
        : '',
    ].filter(Boolean);
  });

  protected readonly registration = computed<CardRegistration | null>(() => {
    const summary = this.summary();
    if (!summary) {
      return null;
    }
    const now = this.now();
    const status = registrationStatus(summary, now);
    if (status === 'none') {
      return null;
    }
    const until = {
      'not-open': summary.registrationOpens,
      open: summary.registrationCloses,
      closed: null,
    }[status];
    const countdown = until ? countdownParts(Date.parse(until) - now.getTime()) : [];
    return {
      status,
      label: REGISTRATION_LABELS[status],
      countdown,
      description: describeCountdown(countdown),
    };
  });
}
