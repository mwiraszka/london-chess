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
import { debounceTime } from 'rxjs/operators';

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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { FormActionsComponent } from '@app/components/form-actions/form-actions.component';
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import { EVENT_TYPE_OPTIONS, initialEventFormData } from '@app/constants';
import {
  FORM_CHANGE_DEBOUNCE,
  FORM_ERROR_MESSAGES,
  WEEK_STARTS_ON,
} from '@app/constants/forms';
import {
  Dialog,
  Event,
  EventFormData,
  EventFormGroup,
  EventFormValue,
  Id,
} from '@app/models';
import { StoreRequestService } from '@app/services';
import { EventsActions } from '@app/store/events';
import { fromClubDateTime, toClubDateTime } from '@app/utils';
import { idValidator, textValidator } from '@app/validators';

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
    this.form = this.buildForm(this.formData());

    this.form.valueChanges
      .pipe(debounceTime(FORM_CHANGE_DEBOUNCE), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitChange());

    if (this.hasUnsavedChanges()) {
      this.form.markAllAsTouched();
    }
  }

  public onRestore(): void {
    const originalEvent = this.originalEvent();
    this.restore.emit(originalEvent?.id ?? null);
    this.form.reset(this.toFormValue(originalEvent ?? initialEventFormData()));
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
    this.emitChange();

    const originalEvent = this.originalEvent();
    const dialog: Dialog = {
      title: 'Confirm',
      body: originalEvent
        ? `Update ${originalEvent.title} event?`
        : `Add ${this.form.controls.title.value} to schedule?`,
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

  private toFormValue(data: EventFormData): EventFormValue {
    const { day, time } = toClubDateTime(data.eventDate);
    return {
      eventDay: day,
      eventTime: time,
      title: data.title,
      details: data.details,
      type: data.type,
      articleId: data.articleId,
    };
  }

  private buildForm(data: EventFormData): FormGroup<EventFormGroup> {
    const value = this.toFormValue(data);
    return new FormGroup<EventFormGroup>({
      eventDay: new FormControl<Date | null>(value.eventDay, Validators.required),
      eventTime: new FormControl<string | null>(value.eventTime, Validators.required),
      title: new FormControl(value.title, {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100), textValidator],
      }),
      details: new FormControl(value.details, {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(200), textValidator],
      }),
      type: new FormControl(value.type, {
        nonNullable: true,
        validators: Validators.required,
      }),
      articleId: new FormControl(value.articleId, {
        nonNullable: true,
        validators: idValidator,
      }),
    });
  }

  // Only an edit makes a draft, so opening a form changes nothing in the store
  private emitChange(): void {
    if (!this.form.dirty) {
      return;
    }
    const { eventDay, eventTime, ...fields } = this.form.getRawValue();
    const eventDate = fromClubDateTime(eventDay, eventTime);
    this.change.emit({
      eventId: this.originalEvent()?.id ?? null,
      formData: eventDate ? { ...fields, eventDate } : fields,
    });
  }
}
