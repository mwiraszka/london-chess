import {
  PaginatorComponent,
  PaginatorState,
  SkeletonComponent,
  TrophyIconComponent,
} from '@eagami/ui';

import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import {
  DataTableCellContext,
  DataTableComponent,
  LccDataTableColumn,
} from '@app/components/data-table/data-table.component';
import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { EVENTS_PAGE_SIZES, WIDEST_EVENT } from '@app/constants/events-table';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import {
  AdminControlsConfig,
  BasicDialogResult,
  DataPaginationOptions,
  Dialog,
  Event,
} from '@app/models';
import { FormatDatePipe, HighlightPipe, KebabCasePipe } from '@app/pipes';
import { DialogService, StoreRequestService } from '@app/services';
import { EventsActions } from '@app/store/events';
import { customSort, isUpcomingEvent, pageRowCount } from '@app/utils';

// A row holds a day and every event of that day, latest edited first
export interface EventRow {
  id: string;
  date: string;
  events: Event[];
}

function toEventRows(events: Event[]): EventRow[] {
  const rows: EventRow[] = [];
  for (const event of events) {
    const date = event.eventDate.slice(0, 10);
    const row = rows.find(row => row.date === date);
    if (row) {
      row.events.push(event);
    } else {
      rows.push({ id: date, date, events: [event] });
    }
  }
  rows.forEach(({ events }) =>
    events.sort((a, b) => customSort(a, b, 'modificationInfo.dateLastEdited', true)),
  );
  return rows;
}

const SIZING_ROWS: EventRow[] = toEventRows([WIDEST_EVENT]);

type CellTemplate = TemplateRef<DataTableCellContext<EventRow>>;

@Component({
  selector: 'lcc-events-table',
  templateUrl: './events-table.component.html',
  styleUrl: './events-table.component.scss',
  imports: [
    AdminControlsDirective,
    DataTableComponent,
    FormatDatePipe,
    HighlightPipe,
    KebabCasePipe,
    NgClass,
    PaginatorComponent,
    RouterLink,
    SkeletonComponent,
    TextSkeletonComponent,
    TrophyIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsTableComponent {
  public readonly events = input.required<Event[]>();
  public readonly isAdmin = input.required<boolean>();
  // The events of the first so many days are shown, when given
  public readonly dateLimit = input<number>();
  public readonly isLoading = input(false);
  // With the options the table pages its events, through their change
  public readonly options = input<DataPaginationOptions<Event>>();
  public readonly filteredCount = input<number | null>(null);
  public readonly showModificationInfo = input(false);

  public readonly optionsChange = output<DataPaginationOptions<Event>>();

  private readonly dialogService = inject(DialogService);
  private readonly storeRequests = inject(StoreRequestService);

  private readonly dateCell = viewChild.required<CellTemplate>('dateCell');
  private readonly entryCell = viewChild.required<CellTemplate>('entryCell');
  private readonly datePlaceholder = viewChild.required<CellTemplate>('datePlaceholder');
  private readonly entryPlaceholder =
    viewChild.required<CellTemplate>('entryPlaceholder');

  protected readonly pageSizes = EVENTS_PAGE_SIZES;
  protected readonly sizingRows = SIZING_ROWS;

  protected readonly search = computed(() => this.options()?.search ?? '');

  // Placeholders replace the events during every fetch, so a change of filters shows at once
  protected readonly loading = computed(() => this.isLoading());

  protected readonly loadingRowCount = computed(() => {
    const pageSize = this.options()?.pageSize ?? EVENTS_PAGE_SIZES[0];
    return (
      this.dateLimit() ??
      pageRowCount(pageSize, this.filteredCount() ?? EVENTS_PAGE_SIZES[0])
    );
  });

  protected readonly rows = computed<EventRow[]>(() =>
    toEventRows(this.events()).slice(0, this.dateLimit()),
  );

  protected readonly columns = computed<LccDataTableColumn<EventRow>[]>(() => [
    {
      key: 'date',
      label: 'Event',
      cellTemplate: this.dateCell(),
      placeholderTemplate: this.datePlaceholder(),
    },
    // Takes the width the day does not need, so the day sits by its date
    {
      key: 'events',
      label: '',
      width: '100%',
      cellTemplate: this.entryCell(),
      placeholderTemplate: this.entryPlaceholder(),
    },
  ]);

  // The first day shown that is still to come: the line above it parts it from the
  // past, and the schedule scrolls to it
  protected readonly todayRowId = computed(
    () => this.rows().find(({ events }) => events.some(isUpcomingEvent))?.id ?? null,
  );

  public getAdminControlsConfig(event: Event): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () => this.onDeleteEvent(event),
      editPath: ['event', 'edit', event.id],
      itemName: event.title,
    };
  }

  public onPageChanged({ page, pageSize }: PaginatorState): void {
    const options = this.options();
    if (options) {
      this.optionsChange.emit({ ...options, page, pageSize });
    }
  }

  public async onDeleteEvent(event: Event): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Delete ${event.title}?`,
      confirmButtonText: 'Delete',
      confirmButtonType: 'warning',
      confirmAction: () =>
        this.storeRequests.dispatch(EventsActions.deleteEventRequested({ event }), [
          EventsActions.deleteEventSucceeded,
          EventsActions.deleteEventFailed,
        ]),
    };

    await this.dialogService.open<BasicDialogComponent, BasicDialogResult>({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: true,
    });
  }
}
