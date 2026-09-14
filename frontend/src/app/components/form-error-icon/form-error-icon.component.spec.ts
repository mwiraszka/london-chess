import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';

import { TooltipDirective } from '@app/directives/tooltip.directive';
import { query } from '@app/utils';
import { emailValidator } from '@app/validators';

import { FormErrorIconComponent } from './form-error-icon.component';

describe('FormErrorIconComponent', () => {
  let fixture: ComponentFixture<FormErrorIconComponent>;
  let component: FormErrorIconComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormErrorIconComponent, TooltipDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(FormErrorIconComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template rendering', () => {
    it('should render visible icon if control is touched and invalid', () => {
      fixture.componentRef.setInput(
        'control',
        new FormControl('', { validators: Validators.required }),
      );
      component.control().markAsTouched();
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ea-icon-alert-triangle')).toBeTruthy();
      expect(
        fixture.nativeElement
          .querySelector('ea-icon-alert-triangle')
          .classList.contains('form-error-icon--hidden'),
      ).toBe(false);
    });

    it('should render hidden icon if control is invalid but not touched', () => {
      fixture.componentRef.setInput(
        'control',
        new FormControl('', { validators: Validators.required }),
      );
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ea-icon-alert-triangle')).toBeTruthy();
      expect(
        fixture.nativeElement
          .querySelector('ea-icon-alert-triangle')
          .classList.contains('form-error-icon--hidden'),
      ).toBe(true);
    });

    it('should render hidden icon if control is touched but not invalid', () => {
      fixture.componentRef.setInput(
        'control',
        new FormControl('hello world', { validators: Validators.required }),
      );
      component.control().markAsTouched();
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ea-icon-alert-triangle')).toBeTruthy();
      expect(
        fixture.nativeElement
          .querySelector('ea-icon-alert-triangle')
          .classList.contains('form-error-icon--hidden'),
      ).toBe(true);
    });

    it('should display first listed error message in tooltip if control has multiple errors', () => {
      fixture.componentRef.setInput(
        'control',
        new FormControl('test', {
          validators: [Validators.required, emailValidator],
        }),
      );
      fixture.detectChanges();

      const tooltipDirective = query(
        fixture.debugElement,
        'ea-icon-alert-triangle',
      ).injector.get(TooltipDirective);

      expect(tooltipDirective.tooltip).toBe('Invalid email');

      fixture.componentRef.setInput(
        'control',
        new FormControl('', {
          validators: [Validators.required, emailValidator],
        }),
      );
      fixture.detectChanges();

      expect(tooltipDirective.tooltip).toBe('This field is required');
    });
  });
});
