import {
  ButtonComponent,
  CalendarDaysIconComponent,
  DialogComponent,
  DialogRef,
} from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { EventTypeTagComponent } from '@app/components/event-type-tag/event-type-tag.component';
import { Event } from '@app/models';
import { FormatDatePipe } from '@app/pipes';

@Component({
  selector: 'lcc-event-info-dialog',
  template: `
    <ea-dialog
      width="sm"
      (keydown.enter)="onEnter($event)">
      <h3 slot="header">{{ event().title }}</h3>

      <div class="dialog-body">
        <div class="event-date">
          <ea-icon-calendar-days
            class="calendar-icon"
            aria-hidden="true" />
          {{ event().eventDate | formatDate: 'long no-time' }}
        </div>

        <lcc-event-type-tag
          class="event-type"
          [type]="event().type" />

        @if (details()) {
          <p class="event-details">{{ details() }}</p>
        }
      </div>

      @if (event().articleId) {
        <div slot="footer">
          <ea-button
            class="details-button"
            (clicked)="dialogRef.close('details')">
            More details
          </ea-button>
        </div>
      }
    </ea-dialog>
  `,
  styleUrl: 'event-info-dialog.component.scss',
  imports: [
    ButtonComponent,
    CalendarDaysIconComponent,
    DialogComponent,
    EventTypeTagComponent,
    FormatDatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventInfoDialogComponent {
  protected readonly dialogRef = inject<DialogRef<'details'>>(DialogRef);

  readonly event = input.required<Event>();

  protected readonly details = computed(() =>
    this.event().details.replace('\\n', '\n\n'),
  );

  // A focused button answers Enter itself, so only Enter from elsewhere opens the article
  protected onEnter(keydown: globalThis.Event): void {
    if (!this.event().articleId || keydown.target instanceof HTMLButtonElement) {
      return;
    }
    keydown.preventDefault();
    this.dialogRef.close('details');
  }
}
