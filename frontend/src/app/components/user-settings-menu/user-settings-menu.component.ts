import {
  AlertTriangleIconComponent,
  AvatarComponent,
  ButtonComponent,
  ButtonLinkComponent,
  DividerComponent,
  SwitchComponent,
  ToastService,
  TooltipDirective,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { User } from '@app/models';
import { AuthDrawerService, ClerkService } from '@app/services';
import { AppActions, AppSelectors } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';
import { isTouchDevice } from '@app/utils';

@Component({
  selector: 'lcc-user-settings-menu',
  templateUrl: './user-settings-menu.component.html',
  styleUrl: './user-settings-menu.component.scss',
  imports: [
    AlertTriangleIconComponent,
    AvatarComponent,
    ButtonComponent,
    ButtonLinkComponent,
    CommonModule,
    DividerComponent,
    RouterLink,
    SwitchComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserSettingsMenuComponent implements OnInit {
  private readonly store = inject(Store);

  public readonly close = output<void>();

  public readonly isTouchDevice = isTouchDevice();

  private readonly authDrawerService = inject(AuthDrawerService);
  private readonly clerkService = inject(ClerkService);
  private readonly toast = inject(ToastService);

  public viewModel$?: Observable<{
    user: User | null;
    isSafeMode: boolean;
    isDarkMode: boolean;
    isWideView: boolean;
    isDesktopView: boolean;
  }>;

  // Clerk serves the cropped display avatar; the R2 original is editor-only
  public readonly avatarSrc = computed(() => {
    const user = this.clerkService.user();
    return user?.hasImage ? user.imageUrl : undefined;
  });

  public readonly initials = computed(() => {
    const user = this.clerkService.user();
    const first = user?.firstName?.[0] ?? '';
    const last = user?.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || undefined;
  });

  public ngOnInit(): void {
    this.viewModel$ = combineLatest([
      this.store.select(AuthSelectors.selectUser),
      this.store.select(AppSelectors.selectIsSafeMode),
      this.store.select(AppSelectors.selectIsDarkMode),
      this.store.select(AppSelectors.selectIsWideView),
      this.store.select(AppSelectors.selectIsDesktopView),
    ]).pipe(
      map(([user, isSafeMode, isDarkMode, isWideView, isDesktopView]) => ({
        user,
        isSafeMode,
        isDarkMode,
        isWideView,
        isDesktopView,
      })),
    );
  }

  public onToggleSafeMode(): void {
    this.store.dispatch(AppActions.safeModeToggled());
  }

  public onToggleTheme(): void {
    this.store.dispatch(AppActions.themeToggled());
  }

  public onToggleWideView(): void {
    this.store.dispatch(AppActions.wideViewToggled());
  }

  public onToggleDesktopView(): void {
    this.store.dispatch(AppActions.desktopViewToggled());
  }

  public onLogin(): void {
    this.authDrawerService.openLogin();
    this.close.emit();
  }

  public async onLogout(): Promise<void> {
    this.close.emit();
    await this.clerkService.logOut();
    this.toast.show('Successfully logged out.', {
      title: 'Logged out',
      variant: 'success',
    });
  }
}
