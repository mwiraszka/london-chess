import {
  CardComponent,
  DatePickerComponent,
  DialogService,
  DividerComponent,
  InputComponent,
  RadioComponent,
  RadioGroupComponent,
  TextareaComponent,
  TimePickerComponent,
} from '@eagami/ui';
import { Subject } from 'rxjs';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { FormActionsComponent } from '@app/components/form-actions/form-actions.component';
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import { EVENT_TYPE_OPTIONS, initialEventFormData } from '@app/constants';
import { FORM_ERROR_MESSAGES, WEEK_STARTS_ON } from '@app/constants/forms';
import { Dialog, Event, EventFormData, EventFormGroup, Id } from '@app/models';
import { StoreRequestService } from '@app/services';
import { EventsActions } from '@app/store/events';
import {
  createEventFormGroup,
  draftDebounce,
  fromEventFormGroup,
  toEventFormValue,
} from '@app/utils';

@Component({
  selector: 'lcc-event-form',
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss',
  imports: [
    CardComponent,
    DatePickerComponent,
    DividerComponent,
    FormActionsComponent,
    InputComponent,
    ModificationInfoComponent,
    RadioComponent,
    RadioGroupComponent,
    ReactiveFormsModule,
    TextareaComponent,
    TimePickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventFormComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly saved = new Subject<void>();
  private readonly dialogService = inject(DialogService);
  private readonly storeRequests = inject(StoreRequestService);

  readonly formData = input.required<EventFormData>();
  readonly hasUnsavedChanges = input.required<boolean>();
  readonly originalEvent = input.required<Event | null>();

  readonly cancel = output<void>();
  readonly change = output<{
    eventId: Id | null;
    formData: Partial<EventFormData>;
  }>();
  readonly restore = output<Id | null>();

  protected readonly errorMessages = FORM_ERROR_MESSAGES;
  protected readonly eventTypeOptions = EVENT_TYPE_OPTIONS;
  protected readonly weekStartsOn = WEEK_STARTS_ON;

  public form!: FormGroup<EventFormGroup>;

  public ngOnInit(): void {
    this.form = createEventFormGroup(this.formData());

    this.form.valueChanges
      .pipe(draftDebounce(this.saved), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitChange());

    if (this.hasUnsavedChanges()) {
      this.form.markAllAsTouched();
    }
  }

  public onRestore(): void {
    const originalEvent = this.originalEvent();
    this.restore.emit(originalEvent?.id ?? null);
    this.form.reset(toEventFormValue(originalEvent ?? initialEventFormData()));
  }

  public onCancel(): void {
    this.cancel.emit();
  }

  // A click that leaves the page starts by leaving a field, so the draft is saved first
  public onFieldLeft(): void {
    this.emitChange();
  }

  public async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // The draft reaches the store after a pause in typing, and saving reads it from there
    this.saved.next();
    this.emitChange();

    const originalEvent = this.originalEvent();
    const dialog: Dialog = {
      title: 'Confirm',
      body: originalEvent
        ? `Update ${originalEvent.title} event?`
        : `Add ${this.form.controls.title.value} to the schedule?`,
      confirmButtonText: originalEvent ? 'Update' : 'Add',
      confirmAction: () => this.save(),
    };

    await this.dialogService.open(BasicDialogComponent, { inputs: { dialog } }).result;
  }

  private save(): Promise<unknown> {
    const originalEvent = this.originalEvent();
    return originalEvent
      ? this.storeRequests.dispatch(
          EventsActions.updateEventRequested({ eventId: originalEvent.id }),
          [EventsActions.updateEventSucceeded, EventsActions.updateEventFailed],
        )
      : this.storeRequests.dispatch(EventsActions.addEventRequested(), [
          EventsActions.addEventSucceeded,
          EventsActions.addEventFailed,
        ]);
  }

  // Only an edit makes a draft, so opening a form changes nothing in the store
  private emitChange(): void {
    if (!this.form.dirty) {
      return;
    }
    const { eventDate, ...fields } = fromEventFormGroup(this.form);
    this.change.emit({
      eventId: this.originalEvent()?.id ?? null,
      formData: eventDate ? { ...fields, eventDate } : fields,
    });
  }
}
