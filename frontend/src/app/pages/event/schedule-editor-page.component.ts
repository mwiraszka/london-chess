import {
  AccordionComponent,
  AccordionItemComponent,
  AlertCircleIconComponent,
  ButtonComponent,
  CalendarIconComponent,
  DatePickerComponent,
  DialogService,
  DropdownComponent,
  InputComponent,
  PAGE_SIZE_ALL,
  PlusCircleIconComponent,
  ShieldCheckIconComponent,
  SkeletonComponent,
  TimePickerComponent,
  TrashIconComponent,
  UndoIconComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { isEqual, pick } from 'lodash-es';
import { firstValueFrom } from 'rxjs';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { EventTypeTagComponent } from '@app/components/event-type-tag/event-type-tag.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import {
  EVENT_FORM_DATA_PROPERTIES,
  EVENT_TYPE_OPTIONS,
  initialEventFormData,
} from '@app/constants';
import { FORM_ERROR_MESSAGES, WEEK_STARTS_ON } from '@app/constants/forms';
import {
  Dialog,
  Event,
  EventFormData,
  EventFormGroup,
  EventType,
  Id,
  InternalLink,
  LoadStatus,
  UnsavedChangesPage,
} from '@app/models';
import {
  EventsApiService,
  MetaAndTitleService,
  StoreRequestService,
} from '@app/services';
import { EventsActions } from '@app/store/events';
import { NavActions } from '@app/store/nav';
import { createEventFormGroup, formatDate, fromEventFormGroup } from '@app/utils';

interface ScheduleRow {
  key: string;
  // The event as saved, or null for one being added
  original: Event | null;
  form: FormGroup<EventFormGroup>;
}

type RowState = 'new' | 'changed' | 'removed' | 'unchanged';

interface SchedulePanel {
  row: ScheduleRow;
  heading: string;
  type: EventType;
  state: RowState;
  invalid: boolean;
  // What the header shows by its marks alone, read out instead
  note: string;
  formData: EventFormData;
}

interface ScheduleChangeLists {
  added: EventFormData[];
  updated: Event[];
  removed: Event[];
}

function countOf(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Adds, changes and removes upcoming events in one go, so members who want to hear about
 * the schedule get one email listing every change.
 */
@Component({
  selector: 'lcc-schedule-editor-page',
  templateUrl: './schedule-editor-page.component.html',
  styleUrl: './schedule-editor-page.component.scss',
  imports: [
    AccordionComponent,
    AccordionItemComponent,
    AlertCircleIconComponent,
    ButtonComponent,
    DatePickerComponent,
    DropdownComponent,
    EventTypeTagComponent,
    InputComponent,
    LinkListComponent,
    LoadFailedComponent,
    PageHeaderComponent,
    ReactiveFormsModule,
    SkeletonComponent,
    TimePickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lcc-page--reading' },
})
export class ScheduleEditorPageComponent implements OnInit, UnsavedChangesPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogService = inject(DialogService);
  private readonly eventsApiService = inject(EventsApiService);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);
  private readonly storeRequests = inject(StoreRequestService);

  protected readonly adminIcon = ShieldCheckIconComponent;
  protected readonly addIcon = PlusCircleIconComponent;
  protected readonly removeIcon = TrashIconComponent;
  protected readonly keepIcon = UndoIconComponent;
  protected readonly errorMessages = FORM_ERROR_MESSAGES;
  protected readonly eventTypeOptions = EVENT_TYPE_OPTIONS;
  protected readonly weekStartsOn = WEEK_STARTS_ON;
  protected readonly schedulePageLink: InternalLink = {
    text: 'See all events',
    internalPath: 'schedule',
    icon: CalendarIconComponent,
  };

  // Headers of a few events of varying length, shaped like the real ones, while they load
  protected readonly placeholderTitleWidths = [
    '12rem',
    '16rem',
    '13rem',
    '15rem',
    '12rem',
    '16rem',
  ];
  // A small tag: one line of small text with its padding and border
  protected readonly chipPlaceholderHeight =
    'calc(1.5 * var(--font-size-sm) + 2 * var(--border-width-thin))';

  protected readonly status = signal<LoadStatus>('loading');
  protected readonly rows = signal<ScheduleRow[]>([]);
  protected readonly removedIds = signal<ReadonlySet<Id>>(new Set());
  protected readonly expandedKeys = signal<readonly string[]>([]);
  protected readonly saving = signal(false);
  // Counts every edit, as the forms' values are not signals
  private readonly edits = signal(0);
  private addedCount = 0;

  protected readonly panels = computed((): SchedulePanel[] => {
    this.edits();
    const removedIds = this.removedIds();
    return this.rows().map(row => {
      const { eventDate, ...fields } = fromEventFormGroup(row.form);
      const formData: EventFormData = { ...fields, eventDate: eventDate ?? '' };
      const { original } = row;
      const state: RowState = !original
        ? 'new'
        : removedIds.has(original.id)
          ? 'removed'
          : isEqual(formData, pick(original, EVENT_FORM_DATA_PROPERTIES))
            ? 'unchanged'
            : 'changed';
      const title = formData.title.trim() || 'New event';
      const invalid = row.form.invalid;
      const notes = [
        state === 'new' ? 'new' : '',
        state === 'removed' ? 'to be removed' : '',
        invalid ? 'has errors' : '',
      ].filter(Boolean);
      return {
        row,
        heading: eventDate
          ? `${title}, ${formatDate(eventDate, 'short at-time')}`
          : title,
        type: formData.type,
        state,
        invalid,
        note: notes.length ? `(${notes.join(', ')})` : '',
        formData,
      };
    });
  });

  protected readonly changes = computed((): ScheduleChangeLists => {
    const lists: ScheduleChangeLists = { added: [], updated: [], removed: [] };
    for (const { row, state, formData } of this.panels()) {
      if (!row.original) {
        lists.added.push(formData);
      } else if (state === 'removed') {
        lists.removed.push(row.original);
      } else if (state === 'changed') {
        lists.updated.push({ ...row.original, ...formData });
      }
    }
    return lists;
  });

  protected readonly changeCount = computed(() => {
    const { added, updated, removed } = this.changes();
    return added.length + updated.length + removed.length;
  });

  public readonly hasUnsavedChanges = computed(() => this.changeCount() > 0);

  protected readonly summary = computed(() => {
    const { added, updated, removed } = this.changes();
    return [
      added.length ? `${countOf(added.length, 'event')} to add` : '',
      updated.length ? `${countOf(updated.length, 'event')} to change` : '',
      removed.length ? `${countOf(removed.length, 'event')} to remove` : '',
    ]
      .filter(Boolean)
      .join(', ');
  });

  protected readonly isInvalid = computed(() => {
    this.edits();
    return this.rows().some(({ form }) => form.invalid);
  });

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Edit the schedule');
    this.metaAndTitleService.updateDescription(
      'Add, change and remove upcoming events at the London Chess Club.',
    );
    void this.load();
  }

  public async load(): Promise<void> {
    this.status.set('loading');
    try {
      const { data } = await firstValueFrom(
        this.eventsApiService.getFilteredEvents({
          page: 1,
          pageSize: PAGE_SIZE_ALL,
          sortBy: 'eventDate',
          sortOrder: 'asc',
          filters: {
            showPastEvents: { label: 'Show past events', value: false },
          },
          search: '',
        }),
      );
      this.rows.set(data.items.map(event => this.createRow(event.id, event)));
      this.removedIds.set(new Set());
      this.expandedKeys.set([]);
      this.status.set('loaded');
    } catch {
      this.status.set('failed');
    }
  }

  // A new event goes first and opens, so it is in view however long the schedule is
  public onAdd(): void {
    this.addedCount += 1;
    const row = this.createRow(`new-${this.addedCount}`, null);
    this.rows.update(rows => [row, ...rows]);
    this.expandedKeys.update(keys => [row.key, ...keys]);
  }

  public onRemoveToggled(row: ScheduleRow): void {
    const { original } = row;
    if (!original) {
      this.rows.update(rows => rows.filter(({ key }) => key !== row.key));
      this.expandedKeys.update(keys => keys.filter(key => key !== row.key));
      return;
    }
    const isRemoved = this.removedIds().has(original.id);
    this.removedIds.update(ids => {
      const next = new Set(ids);
      if (isRemoved) {
        next.delete(original.id);
      } else {
        next.add(original.id);
      }
      return next;
    });
    if (isRemoved) {
      row.form.enable();
    } else {
      row.form.disable();
    }
  }

  public onCancel(): void {
    this.store.dispatch(NavActions.navigationRequested({ path: 'schedule' }));
  }

  public async onSave(): Promise<void> {
    const count = this.changeCount();
    const dialog: Dialog = {
      title: 'Confirm',
      body: `Save ${count === 1 ? 'this change' : `these ${count} changes`} to the schedule? Members who get schedule emails are sent one email listing ${count === 1 ? 'it' : 'them all'}.`,
      confirmButtonText: 'Save',
      confirmAction: () => this.save(),
    };
    await this.dialogService.open(BasicDialogComponent, { inputs: { dialog } }).result;
  }

  private async save(): Promise<void> {
    this.saving.set(true);
    try {
      const outcome = await this.storeRequests.dispatch(
        EventsActions.scheduleChangesRequested(this.changes()),
        [EventsActions.scheduleChangesSucceeded, EventsActions.scheduleChangesFailed],
      );
      if (outcome.type === EventsActions.scheduleChangesSucceeded.type) {
        // Saved changes are no reason to ask before leaving
        this.rows.set([]);
        this.onCancel();
      }
    } finally {
      this.saving.set(false);
    }
  }

  private createRow(key: string, original: Event | null): ScheduleRow {
    const form = createEventFormGroup(
      original ? pick(original, EVENT_FORM_DATA_PROPERTIES) : initialEventFormData(),
    );
    form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.edits.update(count => count + 1));
    return { key, original, form };
  }
}
