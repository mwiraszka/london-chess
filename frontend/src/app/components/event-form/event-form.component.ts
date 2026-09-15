import { HistoryIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import moment from 'moment-timezone';
import { debounceTime } from 'rxjs/operators';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { DatePickerComponent } from '@app/components/date-picker/date-picker.component';
import { FormErrorIconComponent } from '@app/components/form-error-icon/form-error-icon.component';
import { ModificationInfoComponent } from '@app/components/modification-info/modification-info.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import {
  BasicDialogResult,
  Dialog,
  Event,
  EventFormData,
  EventFormGroup,
  Id,
} from '@app/models';
import { DialogService } from '@app/services';
import { isValidTime } from '@app/utils';
import { idValidator, textValidator, timeValidator } from '@app/validators';

@UntilDestroy()
@Component({
  selector: 'lcc-event-form',
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss',
  imports: [
    DatePickerComponent,
    FormErrorIconComponent,
    HistoryIconComponent,
    ModificationInfoComponent,
    ReactiveFormsModule,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventFormComponent implements OnInit {
  @Input({ required: true }) formData!: EventFormData;
  @Input({ required: true }) hasUnsavedChanges!: boolean;
  @Input({ required: true }) originalEvent!: Event | null;

  @Output() cancel = new EventEmitter<void>();
  @Output() change = new EventEmitter<{
    eventId: Id | null;
    formData: Partial<EventFormData>;
  }>();
  @Output() requestAddEvent = new EventEmitter<void>();
  @Output() requestUpdateEvent = new EventEmitter<Id>();
  @Output() restore = new EventEmitter<Id | null>();

  public form!: FormGroup<EventFormGroup>;

  constructor(
    private readonly dialogService: DialogService,
    private readonly formBuilder: FormBuilder,
  ) {}

  public ngOnInit(): void {
    this.initForm();
    this.initFormValueChangeListener();

    if (this.hasUnsavedChanges) {
      this.form.markAllAsTouched();
    }
  }

  public async onRestore(): Promise<void> {
    const dialog: Dialog = {
      title: 'Confirm',
      body: 'Restore original event data? All changes will be lost.',
      confirmButtonText: 'Restore',
      confirmButtonType: 'warning',
    };

    const dialogResult = await this.dialogService.open<
      BasicDialogComponent,
      BasicDialogResult
    >({
      componentType: BasicDialogComponent,
      inputs: { dialog },
      isModal: false,
    });

    if (dialogResult !== 'confirm') {
      return;
    }

    this.restore.emit(this.originalEvent?.id ?? null);

    setTimeout(() => this.ngOnInit());
  }

  public onCancel(): void {
    this.cancel.emit();
  }

  public async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dialog: Dialog = {
      title: 'Confirm',
      body: this.originalEvent
        ? `Update ${this.originalEvent.title} event?`
        : `Add ${this.formData.title} to schedule?`,
      confirmButtonText: this.originalEvent ? 'Update' : 'Add',
    };

    const result = await this.dialogService.open<BasicDialogComponent, BasicDialogResult>(
      {
        componentType: BasicDialogComponent,
        inputs: { dialog },
        isModal: false,
      },
    );

    if (result !== 'confirm') {
      return;
    }

    if (this.originalEvent) {
      this.requestUpdateEvent.emit(this.originalEvent.id);
    } else {
      this.requestAddEvent.emit();
    }
  }

  private initForm(): void {
    // Displayed in local time since America/Toronto set as default timezone in app.component
    const eventTime: string = moment(this.formData.eventDate).format('h:mm A');

    this.form = this.formBuilder.group({
      eventDate: new FormControl(this.formData.eventDate, {
        nonNullable: true,
        validators: Validators.required,
      }),
      eventTime: new FormControl(eventTime, {
        nonNullable: true,
        validators: [Validators.required, timeValidator],
      }),
      title: new FormControl(this.formData.title, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      details: new FormControl(this.formData.details, {
        nonNullable: true,
        validators: [Validators.required, textValidator],
      }),
      type: new FormControl(this.formData.type, {
        nonNullable: true,
        validators: Validators.required,
      }),
      articleId: new FormControl(this.formData.articleId, {
        nonNullable: true,
        validators: idValidator,
      }),
    });
  }

  private initFormValueChangeListener(): void {
    this.form.valueChanges
      .pipe(debounceTime(250), untilDestroyed(this))
      .subscribe(
        (formDataWithEventTime: Partial<EventFormData & { eventTime: string }>) => {
          const { eventTime, ...formData } = formDataWithEventTime;

          if (isValidTime(eventTime)) {
            let hours = Number(eventTime.split(':')[0]) % 12;
            if (eventTime.slice(-2).toUpperCase() === 'PM') {
              hours += 12;
            }
            const minutes = Number(eventTime.split(':')[1].slice(0, 2));

            formData.eventDate = moment(formData.eventDate)
              .hours(hours)
              .minutes(minutes)
              .toISOString();
          }

          return this.change.emit({
            eventId: this.originalEvent?.id ?? null,
            formData,
          });
        },
      );

    // Manually trigger form data change to pass initial form data to store
    this.form.updateValueAndValidity();
  }
}
