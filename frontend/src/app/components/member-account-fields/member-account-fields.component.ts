import { InputComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { ChessUsernameFieldsComponent } from '@app/components/chess-username-fields/chess-username-fields.component';
import { PhoneNumberFieldComponent } from '@app/components/phone-number-field/phone-number-field.component';
import { YearOfBirthFieldComponent } from '@app/components/year-of-birth-field/year-of-birth-field.component';
import { MemberAccountFormGroup } from '@app/models';

@Component({
  selector: 'lcc-member-account-fields',
  templateUrl: './member-account-fields.component.html',
  styleUrl: './member-account-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ChessUsernameFieldsComponent,
    InputComponent,
    PhoneNumberFieldComponent,
    ReactiveFormsModule,
    YearOfBirthFieldComponent,
  ],
})
export class MemberAccountFieldsComponent {
  readonly autofocus = input(false);
  readonly group = input.required<FormGroup<MemberAccountFormGroup>>();
  readonly yearOfBirthRequired = input(true);
}
