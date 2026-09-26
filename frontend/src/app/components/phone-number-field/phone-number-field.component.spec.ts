import { InputComponent } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { query } from '@app/utils';

import { PhoneNumberFieldComponent } from './phone-number-field.component';

describe('PhoneNumberFieldComponent', () => {
  let fixture: ComponentFixture<PhoneNumberFieldComponent>;
  let control: FormControl<string>;

  const input = (): HTMLInputElement =>
    query(fixture.debugElement, 'input#phone-number-input').nativeElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhoneNumberFieldComponent],
    }).compileComponents();

    control = new FormControl('416-555-0100', { nonNullable: true });
    fixture = TestBed.createComponent(PhoneNumberFieldComponent);
    fixture.componentRef.setInput('control', control);
    fixture.detectChanges();
  });

  it('should bind the control to a labelled phone input', () => {
    expect(input().value).toBe('416-555-0100');
    expect(input().type).toBe('tel');
    expect(query(fixture.debugElement, 'label').nativeElement.getAttribute('for')).toBe(
      'phone-number-input',
    );
  });

  it('should write typed values back to the control', () => {
    input().value = '555-123-1234';
    input().dispatchEvent(new Event('input'));

    expect(control.value).toBe('555-123-1234');
  });

  it('should explain on hover how the phone number is used', () => {
    query(fixture.debugElement, '.field-label__help').triggerEventHandler(
      'mouseenter',
      new MouseEvent('mouseenter'),
    );
    fixture.detectChanges();

    expect(document.querySelector('.cdk-overlay-container em')).toBeTruthy();
  });

  it('should explain a pattern error', () => {
    const field: InputComponent = query(
      fixture.debugElement,
      'ea-input',
    ).componentInstance;

    expect(field.errorMessages()?.['pattern']).toBeTruthy();
  });
});
