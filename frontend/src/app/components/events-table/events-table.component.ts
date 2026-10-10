import {
  DataTableColumn,
  PaginatorComponent,
  PaginatorState,
  SkeletonComponent,
} from '@eagami/ui';

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

import {
  DataTableCellContext,
  DataTableComponent,
} from '@app/components/data-table/data-table.component';
import { EventTypeTagComponent } from '@app/components/event-type-tag/event-type-tag.component';
import { TextSkeletonComponent } from '@app/components/text-skeleton/text-skeleton.component';
import { PAGE_SIZES } from '@app/constants/filters';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { AdminControlsConfig, DataPaginationOptions, Event } from '@app/models';
import { FormatDatePipe, HighlightPipe } from '@app/pipes';
import { DeletionService } from '@app/services';
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

type CellTemplate = TemplateRef<DataTableCellContext<EventRow>>;
type PlaceholderTemplate = TemplateRef<{
  $implicit: DataTableColumn<EventRow>;
  index: number;
}>;

@Component({
  selector: 'lcc-events-table',
  templateUrl: './events-table.component.html',
  styleUrl: './events-table.component.scss',
  imports: [
    AdminControlsDirective,
    DataTableComponent,
    EventTypeTagComponent,
    FormatDatePipe,
    HighlightPipe,
    PaginatorComponent,
    RouterLink,
    SkeletonComponent,
    TextSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsTableComponent {
  public readonly events = input.required<Event[]>();
  public readonly isAdmin = input.required<boolean>();
  // The events of the first so many days are shown, when given
  public readonly dateLimit = input<number>();
  // Placeholders replace the events during every fetch, so a change of filters shows at once
  public readonly isLoading = input(false);
  // With the options the table pages its events, through their change
  public readonly options = input<DataPaginationOptions<Event>>();
  public readonly filteredCount = input<number | null>(null);
  public readonly showModificationInfo = input(false);
  public readonly markToday = input(false);
  // Null while they are still on their way
  public readonly widestEvents = input<Event[] | null>([]);

  public readonly optionsChange = output<DataPaginationOptions<Event>>();

  private readonly deletion = inject(DeletionService);

  private readonly dateCell = viewChild.required<CellTemplate>('dateCell');
  private readonly entryCell = viewChild.required<CellTemplate>('entryCell');
  private readonly datePlaceholder =
    viewChild.required<PlaceholderTemplate>('datePlaceholder');
  private readonly entryPlaceholder =
    viewChild.required<PlaceholderTemplate>('entryPlaceholder');

  protected readonly pageSizes = PAGE_SIZES;

  protected readonly search = computed(() => this.options()?.search ?? '');

  protected readonly loadingRowCount = computed(() => {
    const pageSize = this.options()?.pageSize ?? PAGE_SIZES[0];
    return (
      this.dateLimit() ?? pageRowCount(pageSize, this.filteredCount() ?? PAGE_SIZES[0])
    );
  });

  protected readonly rows = computed<EventRow[]>(() =>
    toEventRows(this.events()).slice(0, this.dateLimit()),
  );

  // Sized from the first skeleton on by the widest of every event, not just this page
  protected readonly sizingRows = computed(() => {
    const widestEvents = this.widestEvents();
    return widestEvents && toEventRows(widestEvents);
  });

  protected readonly columns = computed<DataTableColumn<EventRow>[]>(() => [
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

  // Today falls just above the first day still to come, when this page holds the point
  // where the past ends: somewhere after its first row, or at the very top of page one
  protected readonly todayRowId = computed(() => {
    if (!this.markToday()) {
      return null;
    }
    const rows = this.rows();
    const index = rows.findIndex(({ events }) => events.some(isUpcomingEvent));
    const startsHere = index > 0 || (index === 0 && (this.options()?.page ?? 1) === 1);
    return startsHere ? rows[index].id : null;
  });

  public getAdminControlsConfig(event: Event): AdminControlsConfig {
    return {
      buttonSize: 34,
      deleteCb: () => this.deletion.deleteEvent(event),
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
}
