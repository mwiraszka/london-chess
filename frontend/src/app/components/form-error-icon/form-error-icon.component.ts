import { AlertTriangleIconComponent } from '@eagami/ui';
import { switchMap } from 'rxjs';

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';

import { TooltipDirective } from '@app/directives/tooltip.directive';

@Component({
  selector: 'lcc-form-error-icon',
  template: `
    <ea-icon-alert-triangle
      [class.form-error-icon--hidden]="!hasError()"
      [tooltip]="errorMessage()" />
  `,
  styleUrl: './form-error-icon.component.scss',
  imports: [AlertTriangleIconComponent, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormErrorIconComponent {
  readonly control = input.required<AbstractControl>();

  // Touched and validity changes happen inside the control rather than through
  // the input, so its events are what trigger a re-read
  private readonly controlEvent = toSignal(
    toObservable(this.control).pipe(switchMap(control => control.events)),
  );

  protected readonly hasError = computed(() => {
    this.controlEvent();
    const control = this.control();
    return control.touched && control.invalid;
  });

  protected readonly errorMessage = computed(() => {
    this.controlEvent();
    const control = this.control();

    if (control.hasError('required')) {
      return 'This field is required';
    } else if (control.hasError('pattern') || control.hasError('invalidText')) {
      return 'Text contains invalid characters';
    } else if (control.hasError('invalidOrdinal')) {
      return 'Invalid ordinal number - please input a number between 1 and 99';
    } else if (control.hasError('email')) {
      return 'Invalid email';
    } else if (control.hasError('invalidPhoneNumberFormat')) {
      return 'Invalid phone number format - please input as XXX-XXX-XXXX';
    } else if (control.hasError('invalidRating')) {
      return 'Invalid rating';
    } else if (control.hasError('invalidYearOfBirth')) {
      return 'Invalid year';
    } else if (control.hasError('invalidId')) {
      return 'Invalid ID';
    } else if (control.hasError('minlength')) {
      return 'Input is too short';
    } else if (control.hasError('maxlength')) {
      return 'Input is too long';
    } else {
      return 'Unknown error';
    }
  });
}
