import { SkeletonComponent, TrophyIconComponent } from '@eagami/ui';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminControlsConfig,
  BasicDialogResult,
  DataPaginationOptions,
  Dialog,
  Event,
} from '@app/models';
import { FormatDatePipe, HighlightPipe, KebabCasePipe } from '@app/pipes';
import { DialogService } from '@app/services';
import { customSort } from '@app/utils';

@Component({
  selector: 'lcc-events-table',
  templateUrl: './events-table.component.html',
  styleUrl: './events-table.component.scss',
  imports: [
    AdminControlsDirective,
    CommonModule,
    FormatDatePipe,
    HighlightPipe,
    KebabCasePipe,
    RouterLink,
    SkeletonComponent,
    TrophyIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsTableComponent {
  @Input({ required: true }) public events!: Event[];
  @Input({ required: true }) public isAdmin!: boolean;
  @Input({ required: true }) public nextEvent!: Event | null;

  @Input() public dateLimit?: number;
  @Input() public isLoading?: boolean;
  @Input() public options?: DataPaginationOptions<Event>;
  @Input() public showModificationInfo?: boolean;

  @Output() public requestDeleteEvent = new EventEmitter<Event>();

  private readonly skeletonGroup = (i: number) => ({
    dateKey: `skeleton-${i}`,
    events: [{ id: `skeleton-${i}` } as Event],
    hasNextEvent: false,
  });

  constructor(private readonly dialogService: DialogService) {}

  public get showSkeleton(): boolean {
    return !!this.isLoading;
  }

  public get displayGroups(): {
    dateKey: string;
    events: Event[];
    hasNextEvent: boolean;
  }[] {
    if (this.showSkeleton) {
      let count: number;
      if (this.dateLimit != null) {
        count = this.dateLimit;
      } else if (!this.options || this.options.pageSize === -1) {
        count = this.options?.filters?.showPastEvents?.value ? 200 : 50;
      } else {
        count = this.options.pageSize;
      }
      return Array.from({ length: count }, (_, i) => this.skeletonGroup(i));
    }
    return this.groupedEvents;
  }

  public get groupedEvents(): {
    dateKey: string;
    events: Event[];
    hasNextEvent: boolean;
  }[] {
    const groups: { dateKey: string; events: Event[]; hasNextEvent: boolean }[] = [];
    for (const event of this.events) {
      const dateKey = event.eventDate.slice(0, 10);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.dateKey === dateKey) {
        lastGroup.events.push(event);
        if (event.id === this.nextEvent?.id) {
          lastGroup.hasNextEvent = true;
        }
      } else {
        groups.push({
          dateKey,
          events: [event],
          hasNextEvent: event.id === this.nextEvent?.id,
        });
      }
    }
    groups.forEach(group => {
      if (group.events.length > 1) {
        group.events.sort((a, b) =>
          customSort(a, b, 'modificationInfo.dateLastEdited', true),
        );
      }
    });
    return this.dateLimit !== undefined ? groups.slice(0, this.dateLimit) : groups;
  }

  public getAdminControlsConfig(event: Event): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () => this.onDeleteEvent(event),
      editPath: ['event', 'edit', event.id],
      itemName: event.title,
    };
  }

  public async onDeleteEvent(event: Event): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Delete ${event.title}?`,
      confirmButtonText: 'Delete',
      confirmButtonType: 'warning',
    };

    const result = await this.dialogService.open<BasicDialogComponent, BasicDialogResult>(
      {
        componentType: BasicDialogComponent,
        inputs: { dialog },
        isModal: true,
      },
    );

    if (result === 'confirm') {
      this.requestDeleteEvent.emit(event);
    }
  }
}
