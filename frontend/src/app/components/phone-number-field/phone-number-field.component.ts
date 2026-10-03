import { InputComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { MEMBER_DETAIL_RULES } from '@app/constants/member-details';
import { normalizePhoneNumber } from '@app/utils';

@Component({
  selector: 'lcc-phone-number-field',
  templateUrl: './phone-number-field.component.html',
  styleUrl: './phone-number-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputComponent, ReactiveFormsModule],
})
export class PhoneNumberFieldComponent {
  readonly control = input.required<FormControl<string>>();

  protected readonly errorMessages = { pattern: MEMBER_DETAIL_RULES.phoneNumber.message };

  protected onFieldLeft(): void {
    const control = this.control();
    const normalized = normalizePhoneNumber(control.value);
    if (normalized !== control.value) {
      control.setValue(normalized);
    }
  }
}
