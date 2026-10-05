import { AlertComponent, CheckCircleIconComponent } from '@eagami/ui';

import { TestBed } from '@angular/core/testing';

import { query } from '@app/utils';

import { SafeModeNoticeComponent } from './safe-mode-notice.component';

describe('SafeModeNoticeComponent', () => {
  it('should explain that personal details are hidden and how to show them', () => {
    const fixture = TestBed.createComponent(SafeModeNoticeComponent);

    fixture.detectChanges();

    const alert: AlertComponent = query(
      fixture.debugElement,
      'ea-alert',
    ).componentInstance;
    expect(alert.variant()).toBe('success');
    expect(alert.icon()).toBe(CheckCircleIconComponent);
    expect(fixture.nativeElement.textContent.trim().replace(/\s+/g, ' ')).toBe(
      'Personal details have been hidden from view. You can disable Safe Mode from the User Settings menu.',
    );
  });
});
