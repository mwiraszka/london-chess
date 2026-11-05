import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthDrawerService } from './auth-drawer.service';
import { ClerkService } from './clerk.service';

describe('AuthDrawerService', () => {
  let service: AuthDrawerService;
  let clerk: { load: Mock; isLoggedIn: Mock };

  beforeEach(() => {
    clerk = {
      load: vi.fn().mockResolvedValue(undefined),
      isLoggedIn: vi.fn(() => false),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: ClerkService, useValue: clerk },
      ],
    });
    service = TestBed.inject(AuthDrawerService);
  });

  describe('links into the drawer', () => {
    it('should open the form a link asks for, and drop the link from the address', async () => {
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/head-to-head?blue=2&auth=create-account');

      await service.openFromAddress();

      expect(service.open()).toBe(true);
      expect(service.mode()).toBe('create-account');
      expect(router.url).toBe('/head-to-head?blue=2');
    });

    it('should only drop the link for someone logged in, or a form no link opens', async () => {
      const router = TestBed.inject(Router);
      clerk.isLoggedIn.mockReturnValue(true);
      await router.navigateByUrl('/faq?auth=login');
      await service.openFromAddress();
      clerk.isLoggedIn.mockReturnValue(false);
      await router.navigateByUrl('/faq?auth=forgot-password');

      await service.openFromAddress();

      expect(service.open()).toBe(false);
      expect(router.url).toBe('/faq');
    });

    it('should look for a link after every navigation', async () => {
      const opening = vi.spyOn(service, 'openFromAddress').mockResolvedValue();

      service.listenForLinks();
      await TestBed.inject(Router).navigateByUrl('/faq');

      expect(opening).toHaveBeenCalledTimes(1);
    });
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
