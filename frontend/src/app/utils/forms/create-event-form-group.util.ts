import { FormControl, FormGroup, Validators } from '@angular/forms';

import { EventFormData, EventFormGroup, EventFormValue } from '@app/models';
import {
  fromClubDateTime,
  toClubDateTime,
} from '@app/utils/datetime/club-date-time.util';
import { idValidator, textValidator } from '@app/validators';

export function toEventFormValue(data: EventFormData): EventFormValue {
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

// The event's details as the form holds them, without a date until both its parts are set
export function fromEventFormGroup(
  form: FormGroup<EventFormGroup>,
): Omit<EventFormData, 'eventDate'> & { eventDate: string | null } {
  const { eventDay, eventTime, ...fields } = form.getRawValue();
  return { ...fields, eventDate: fromClubDateTime(eventDay, eventTime) };
}

export function createEventFormGroup(data: EventFormData): FormGroup<EventFormGroup> {
  const value = toEventFormValue(data);
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
