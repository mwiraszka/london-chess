import { InputComponent } from '@eagami/ui';
import { map, startWith, switchMap } from 'rxjs';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { PasswordRequirementsComponent } from '@app/components/password-requirements/password-requirements.component';
import { NewPasswordFormGroup } from '@app/models';

@Component({
  selector: 'lcc-new-password-fields',
  templateUrl: './new-password-fields.component.html',
  styleUrl: './new-password-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InputComponent, PasswordRequirementsComponent, ReactiveFormsModule],
})
export class NewPasswordFieldsComponent {
  readonly autofocus = input(false);
  readonly group = input.required<FormGroup<NewPasswordFormGroup>>();

  protected readonly newPasswordErrorMessages = {
    weakPassword: 'Password does not meet all the requirements',
  };

  protected readonly state = toSignal(
    toObservable(this.group).pipe(
      switchMap(group =>
        group.valueChanges.pipe(
          startWith(null),
          map(() => ({
            newPassword: group.controls.newPassword.value,
            passwordsMismatch: group.hasError('passwordMismatch'),
          })),
        ),
      ),
    ),
    { initialValue: { newPassword: '', passwordsMismatch: false } },
  );
}
