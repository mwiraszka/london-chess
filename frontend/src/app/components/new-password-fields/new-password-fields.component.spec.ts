import { InputComponent } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';

import { NewPasswordFormGroup } from '@app/models';
import { createNewPasswordGroup, query, queryAll } from '@app/utils';

import { NewPasswordFieldsComponent } from './new-password-fields.component';

describe('NewPasswordFieldsComponent', () => {
  let fixture: ComponentFixture<NewPasswordFieldsComponent>;
  let group: FormGroup<NewPasswordFormGroup>;

  const fields = (): InputComponent[] =>
    queryAll(fixture.debugElement, 'ea-input').map(
      (debugElement): InputComponent => debugElement.componentInstance,
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPasswordFieldsComponent],
    }).compileComponents();

    group = createNewPasswordGroup();
    fixture = TestBed.createComponent(NewPasswordFieldsComponent);
    fixture.componentRef.setInput('group', group);
    fixture.detectChanges();
  });

  it('should hide the requirements and mismatch error while empty', () => {
    const [newPassword, confirmPassword] = fields();

    expect(query(fixture.debugElement, 'lcc-password-requirements')).toBeFalsy();
    expect(confirmPassword.errorMsg()).toBe('');
    expect(newPassword.autofocus()).toBe(false);
  });

  it('should show the requirements once a new password is typed', () => {
    group.controls.newPassword.setValue('abc');

    fixture.detectChanges();

    const requirements = query(fixture.debugElement, 'lcc-password-requirements');
    expect(requirements.componentInstance.password()).toBe('abc');
  });

  it('should flag a confirmation that does not match', () => {
    group.setValue({ newPassword: 'Str0ng-password!', confirmPassword: 'different' });

    fixture.detectChanges();

    expect(fields()[1].errorMsg()).toBeTruthy();
  });

  it('should clear the mismatch error once the passwords match', () => {
    group.setValue({ newPassword: 'Str0ng-password!', confirmPassword: 'different' });
    fixture.detectChanges();

    group.controls.confirmPassword.setValue('Str0ng-password!');
    fixture.detectChanges();

    expect(fields()[1].errorMsg()).toBe('');
  });

  it('should follow a replaced group', () => {
    const next = createNewPasswordGroup();
    next.controls.newPassword.setValue('xyz');

    fixture.componentRef.setInput('group', next);
    fixture.componentRef.setInput('autofocus', true);
    fixture.detectChanges();

    const requirements = query(fixture.debugElement, 'lcc-password-requirements');
    expect(requirements.componentInstance.password()).toBe('xyz');
    expect(fields()[0].autofocus()).toBe(true);
  });
});
