import { InputComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { FieldLabelWithHelpComponent } from '@app/components/field-label-with-help/field-label-with-help.component';
import { MEMBER_DETAIL_RULES } from '@app/constants/member-details';

@Component({
  selector: 'lcc-phone-number-field',
  templateUrl: './phone-number-field.component.html',
  styleUrl: './phone-number-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FieldLabelWithHelpComponent, InputComponent, ReactiveFormsModule],
})
export class PhoneNumberFieldComponent {
  readonly control = input.required<FormControl<string>>();

  protected readonly errorMessages = { pattern: MEMBER_DETAIL_RULES.phoneNumber.message };
}
