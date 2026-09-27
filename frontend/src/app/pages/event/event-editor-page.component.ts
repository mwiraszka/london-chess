import { CalendarIconComponent, ShieldCheckIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { EventFormComponent } from '@app/components/event-form/event-form.component';
import { FormSkeletonComponent } from '@app/components/form-skeleton/form-skeleton.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import {
  EditorPage,
  Event,
  EventFormData,
  Id,
  InternalLink,
  LoadStatus,
} from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { EventsActions, EventsSelectors } from '@app/store/events';

@UntilDestroy()
@Component({
  selector: 'lcc-event-editor-page',
  template: `
    @if (viewModel$ | async; as vm) {
      @switch (vm.status) {
        @case ('loaded') {
          <lcc-page-header
            [hasUnsavedChanges]="vm.hasUnsavedChanges"
            [icon]="adminIcon"
            [heading]="vm.pageHeading">
          </lcc-page-header>

          <lcc-event-form
            [formData]="vm.formData"
            [hasUnsavedChanges]="vm.hasUnsavedChanges"
            [originalEvent]="vm.originalEvent"
            (cancel)="onCancel()"
            (change)="onChange($event.eventId, $event.formData)"
            (restore)="onRestore($event)">
          </lcc-event-form>
        }
        @case ('failed') {
          <lcc-load-failed
            title="Unable to load this event"
            (retry)="onRetry(vm.eventId)" />
        }
        @default {
          <lcc-form-skeleton />
        }
      }

      <lcc-link-list [links]="[schedulePageLink]"></lcc-link-list>
    }
  `,
  imports: [
    CommonModule,
    EventFormComponent,
    FormSkeletonComponent,
    LinkListComponent,
    LoadFailedComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEditorPageComponent implements EditorPage, OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly store = inject(Store);

  protected readonly adminIcon = ShieldCheckIconComponent;

  public readonly entity = 'event';
  public readonly schedulePageLink: InternalLink = {
    text: 'See all events',
    internalPath: 'schedule',
    icon: CalendarIconComponent,
  };
  public viewModel$?: Observable<{
    eventId: Id | null;
    formData: EventFormData;
    hasUnsavedChanges: boolean;
    originalEvent: Event | null;
    pageHeading: string;
    status: LoadStatus;
  }>;

  public ngOnInit(): void {
    this.viewModel$ = this.activatedRoute.params.pipe(
      untilDestroyed(this),
      map(params => (params['event_id'] ?? null) as string | null),
      switchMap(eventId =>
        combineLatest([
          of(eventId),
          this.store.select(EventsSelectors.selectEventById(eventId)),
          this.store.select(EventsSelectors.selectEventFormDataById(eventId)),
          this.store.select(EventsSelectors.selectHasUnsavedChanges(eventId)),
          eventId
            ? this.store.select(EventsSelectors.selectEventStatus(eventId))
            : of<LoadStatus>('loaded'),
        ]),
      ),
      map(([eventId, originalEvent, formData, hasUnsavedChanges, status]) => ({
        eventId,
        originalEvent,
        formData,
        hasUnsavedChanges,
        pageHeading: originalEvent ? `Edit ${originalEvent.title}` : 'Add an event',
        status,
      })),
      tap(viewModel => {
        this.metaAndTitleService.updateTitle(viewModel.pageHeading);
        this.metaAndTitleService.updateDescription(
          `${viewModel.pageHeading} for the London Chess Club.`,
        );
      }),
    );
  }

  public onCancel(): void {
    this.store.dispatch(EventsActions.cancelSelected());
  }

  public onChange(eventId: string | null, formData: Partial<EventFormData>): void {
    this.store.dispatch(EventsActions.formDataChanged({ eventId, formData }));
  }

  public onRetry(eventId: Id | null): void {
    if (eventId) {
      this.store.dispatch(EventsActions.fetchEventRequested({ eventId }));
    }
  }

  public onRestore(eventId: string | null): void {
    this.store.dispatch(EventsActions.formDataRestored({ eventId }));
  }
}
