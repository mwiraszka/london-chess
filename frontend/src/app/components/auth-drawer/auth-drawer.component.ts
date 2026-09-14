import { DrawerComponent, type DrawerPosition, type EaWidth } from '@eagami/ui';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { AUTH_DRAWER_BOTTOM_SHEET_MAX_WIDTH } from '@app/constants/auth';
import { AuthDrawerService } from '@app/services/auth-drawer.service';

import { CreateAccountFormComponent } from './create-account-form.component';
import { ForgotPasswordFormComponent } from './forgot-password-form.component';
import { LoginFormComponent } from './login-form.component';

@Component({
  selector: 'lcc-auth-drawer',
  templateUrl: './auth-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:resize)': 'onResize()' },
  imports: [
    CreateAccountFormComponent,
    DrawerComponent,
    ForgotPasswordFormComponent,
    LoginFormComponent,
  ],
})
export class AuthDrawerComponent {
  protected readonly authDrawer = inject(AuthDrawerService);

  private readonly viewportWidth = signal(window.innerWidth);
  private readonly isMobile = computed(
    () => this.viewportWidth() <= AUTH_DRAWER_BOTTOM_SHEET_MAX_WIDTH,
  );

  // On phones the drawer rises from the bottom as a near full-height sheet, the
  // native mobile pattern; on wider screens it stays a right-hand side panel.
  protected readonly position = computed<DrawerPosition>(() =>
    this.isMobile() ? 'bottom' : 'right',
  );
  protected readonly size = computed<EaWidth>(() => (this.isMobile() ? 'full' : 'md'));

  protected readonly title = computed(() => {
    switch (this.authDrawer.mode()) {
      case 'create-account':
        return 'Create account';
      case 'forgot-password':
        return 'Reset password';
      default:
        return 'Welcome back';
    }
  });

  protected onResize(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  // Route the drawer's own closes (X, backdrop, Escape) through close() so the
  // mode resets too, keeping "mode is set before open" an enforced invariant.
  protected onOpenChange(open: boolean): void {
    if (open) {
      this.authDrawer.open.set(true);
    } else {
      this.authDrawer.close();
    }
  }
}
