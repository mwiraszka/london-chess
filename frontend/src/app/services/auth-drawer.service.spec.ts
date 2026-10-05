import { TestBed } from '@angular/core/testing';

import { AuthDrawerService } from './auth-drawer.service';

describe('AuthDrawerService', () => {
  let service: AuthDrawerService;

  beforeEach(() => {
    service = TestBed.inject(AuthDrawerService);
  });

  it('should start closed, on the log in form', () => {
    expect(service.open()).toBe(false);
    expect(service.mode()).toBe('login');
  });

  it('should open on the log in form whatever form was last shown', () => {
    service.setMode('forgot-password');

    service.openLogin();

    expect(service.open()).toBe(true);
    expect(service.mode()).toBe('login');
  });

  it('should fall back to the log in form once closed', () => {
    service.openLogin();
    service.setMode('create-account');

    service.close();

    expect(service.open()).toBe(false);
    expect(service.mode()).toBe('login');
  });

  it('should keep what was typed when switching between forms', () => {
    service.loginForm.controls.email.setValue('jane@example.com');

    service.setMode('create-account');
    service.setMode('login');

    expect(service.loginForm.controls.email.value).toBe('jane@example.com');
  });

  it('should clear what was typed once the forms are reset', () => {
    service.loginForm.controls.email.setValue('jane@example.com');
    service.createAccountForm.controls.firstName.setValue('Jane');

    service.resetForms();

    expect(service.loginForm.controls.email.value).toBe('');
    expect(service.createAccountForm.controls.firstName.value).toBe('');
  });
});
