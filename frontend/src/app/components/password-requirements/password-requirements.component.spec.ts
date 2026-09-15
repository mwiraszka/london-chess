import { ComponentFixture, TestBed } from '@angular/core/testing';

import { queryAll } from '@app/utils';

import { PasswordRequirementsComponent } from './password-requirements.component';

describe('PasswordRequirementsComponent', () => {
  let fixture: ComponentFixture<PasswordRequirementsComponent>;

  const metLabels = (): string[] =>
    queryAll(fixture.debugElement, '.requirement--met').map(element =>
      element.nativeElement.textContent.trim(),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordRequirementsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordRequirementsComponent);
  });

  it('should list every requirement as unmet for an empty password', () => {
    fixture.componentRef.setInput('password', '');

    fixture.detectChanges();

    expect(queryAll(fixture.debugElement, '.requirement').length).toBe(4);
    expect(metLabels()).toEqual([]);
  });

  it('should mark only the requirements the password meets', () => {
    fixture.componentRef.setInput('password', 'abcdefg1');

    fixture.detectChanges();

    expect(metLabels()).toEqual(['At least 8 characters', 'At least one number']);
  });

  it('should mark every requirement for a strong password', () => {
    fixture.componentRef.setInput('password', 'Abcdef1!');

    fixture.detectChanges();

    expect(metLabels().length).toBe(4);
  });
});
