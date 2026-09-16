import { NumberInputComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { MIN_YEAR_OF_BIRTH } from '@app/constants/member-details';

@Component({
  selector: 'lcc-year-of-birth-field',
  templateUrl: './year-of-birth-field.component.html',
  styleUrl: './year-of-birth-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NumberInputComponent, ReactiveFormsModule],
})
export class YearOfBirthFieldComponent {
  readonly control = input.required<FormControl<number | null>>();
  readonly required = input(true);

  protected readonly maxYear = new Date().getFullYear();
  protected readonly minYear = MIN_YEAR_OF_BIRTH;

  protected readonly errorMessages = {
    required: 'This field is required',
    min: 'Invalid year',
    max: 'Invalid year',
    invalidYearOfBirth: 'Invalid year',
  };
}
