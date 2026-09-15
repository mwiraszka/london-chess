import { CalendarDaysIconComponent, TrophyIconComponent } from '@eagami/ui';
import { UntilDestroy } from '@ngneat/until-destroy';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  Renderer2,
} from '@angular/core';

import { DialogOutput, Event } from '@app/models';
import { FormatDatePipe, KebabCasePipe } from '@app/pipes';

@UntilDestroy()
@Component({
  selector: 'lcc-event-info-dialog',
  template: `
    <header class="dialog-title">
      <ea-icon-calendar-days class="calendar-icon" />
      <span>{{ event.eventDate | formatDate: 'long no-time' }}</span>
    </header>

    <div class="dialog-body">
      <div class="event-title">{{ event.title }}</div>

      <div
        class="event-type-wrapper"
        [ngClass]="event.type | kebabCase">
        <span class="event-type">{{ event.type }}</span>

        @if ((event.type | kebabCase) === 'championship') {
          <ea-icon-trophy class="championship-icon" />
        }
      </div>

      <div class="event-details">{{ modifiedEventDetails }}</div>
    </div>

    @if (event.articleId) {
      <button
        class="details-button lcc-primary-button"
        (click)="dialogResult.emit('details')">
        More details
      </button>
    }
  `,
  styleUrl: 'event-info-dialog.component.scss',
  imports: [
    CalendarDaysIconComponent,
    CommonModule,
    FormatDatePipe,
    KebabCasePipe,
    TrophyIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventInfoDialogComponent implements DialogOutput<'details'> {
  @Input({ required: true }) event!: Event;

  @Output() public dialogResult = new EventEmitter<'details' | 'close'>();

  private enterKeyListener!: () => void;

  public get modifiedEventDetails(): string {
    return this.event.details.replace('\\n', '\n\n');
  }

  constructor(private readonly renderer: Renderer2) {}

  public ngOnInit(): void {
    this.enterKeyListener = this.renderer.listen(
      'document',
      'keydown.enter',
      (event: KeyboardEvent) => {
        event.preventDefault();
        this.dialogResult.emit('details');
      },
    );
  }

  public ngOnDestroy(): void {
    this.enterKeyListener();
  }
}
