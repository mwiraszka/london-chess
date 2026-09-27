import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ValidatorFn, Validators } from '@angular/forms';

import { TooltipDirective } from '@app/directives/tooltip.directive';
import { query } from '@app/utils';
import { emailValidator } from '@app/validators';

import { FormErrorIconComponent } from './form-error-icon.component';

describe('FormErrorIconComponent', () => {
  let fixture: ComponentFixture<FormErrorIconComponent>;

  const icon = (): HTMLElement =>
    query(fixture.debugElement, 'ea-icon-alert-triangle').nativeElement;

  const tooltip = (): string | null | undefined => {
    const value = query(fixture.debugElement, 'ea-icon-alert-triangle')
      .injector.get(TooltipDirective)
      .tooltip();
    return typeof value === 'string' ? value : null;
  };

  const render = (control: FormControl): void => {
    fixture.componentRef.setInput('control', control);
    fixture.detectChanges();
  };

  const failingWith =
    (error: string): ValidatorFn =>
    () => ({ [error]: true });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormErrorIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormErrorIconComponent);
  });

  describe('visibility', () => {
    it('should show the icon when the control is touched and invalid', () => {
      const control = new FormControl('', { validators: Validators.required });
      control.markAsTouched();

      render(control);

      expect(icon().classList.contains('form-error-icon--hidden')).toBe(false);
    });

    it('should hide the icon when the control is invalid but not touched', () => {
      render(new FormControl('', { validators: Validators.required }));

      expect(icon().classList.contains('form-error-icon--hidden')).toBe(true);
    });

    it('should hide the icon when the control is touched but valid', () => {
      const control = new FormControl('hello world', { validators: Validators.required });
      control.markAsTouched();

      render(control);

      expect(icon().classList.contains('form-error-icon--hidden')).toBe(true);
    });

    it('should show the icon once the rendered control is touched', () => {
      const control = new FormControl('', { validators: Validators.required });
      render(control);

      control.markAsTouched();
      fixture.detectChanges();

      expect(icon().classList.contains('form-error-icon--hidden')).toBe(false);
    });
  });

  describe('error message', () => {
    it('should prefer the required error over any other', () => {
      render(new FormControl('', { validators: failingWith('required') }));
      const requiredMessage = tooltip();

      render(
        new FormControl('', {
          validators: [failingWith('email'), failingWith('required')],
        }),
      );

      expect(tooltip()).toBe(requiredMessage);
    });

    it('should update the message when the control value changes', () => {
      const control = new FormControl('', {
        validators: [Validators.required, emailValidator],
      });
      render(control);
      const requiredMessage = tooltip();

      control.setValue('not-an-email');
      fixture.detectChanges();

      expect(tooltip()).not.toBe(requiredMessage);
    });

    it('should describe invalid characters the same way for a pattern or text error', () => {
      render(new FormControl('', { validators: failingWith('pattern') }));
      const patternMessage = tooltip();

      render(new FormControl('', { validators: failingWith('invalidText') }));

      expect(tooltip()).toBe(patternMessage);
    });

    it('should give every other error its own message', () => {
      const errors = [
        'required',
        'pattern',
        'invalidOrdinal',
        'email',
        'invalidPhoneNumberFormat',
        'invalidRating',
        'invalidYearOfBirth',
        'invalidId',
        'minlength',
        'maxlength',
        'somethingElse',
      ];

      const messages = errors.map(error => {
        render(new FormControl('', { validators: failingWith(error) }));
        return tooltip();
      });

      expect(messages.every(message => !!message)).toBe(true);
      expect(new Set(messages).size).toBe(errors.length);
    });
  });
});
