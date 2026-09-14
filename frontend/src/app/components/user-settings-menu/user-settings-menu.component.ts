import { AlertTriangleIconComponent, AvatarComponent, ToastService } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  EventEmitter,
  OnInit,
  Output,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { ToggleSwitchComponent } from '@app/components/toggle-switch/toggle-switch.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { User } from '@app/models';
import { AuthDrawerService, ClerkService } from '@app/services';
import { AppActions, AppSelectors } from '@app/store/app';
import { AuthSelectors } from '@app/store/auth';
import { isTouchDevice } from '@app/utils';

@UntilDestroy()
@Component({
  selector: 'lcc-user-settings-menu',
  templateUrl: './user-settings-menu.component.html',
  styleUrl: './user-settings-menu.component.scss',
  imports: [
    AlertTriangleIconComponent,
    AvatarComponent,
    CommonModule,
    ToggleSwitchComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserSettingsMenuComponent implements OnInit {
  @Output() public readonly close = new EventEmitter<void>();

  protected readonly warningIcon = AlertTriangleIconComponent;

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

  private readonly nameEl = viewChild<ElementRef<HTMLElement>>('nameEl');
  private readonly emailEl = viewChild<ElementRef<HTMLElement>>('emailEl');

  public readonly nameTruncated = signal(false);
  public readonly emailTruncated = signal(false);

  constructor(
    private readonly router: Router,
    private readonly store: Store,
  ) {
    afterRenderEffect(() => {
      const name = this.nameEl()?.nativeElement;
      const email = this.emailEl()?.nativeElement;
      this.nameTruncated.set(!!name && name.scrollHeight > name.clientHeight);
      this.emailTruncated.set(!!email && email.scrollHeight > email.clientHeight);
    });
  }

  public ngOnInit(): void {
    this.viewModel$ = combineLatest([
      this.store.select(AuthSelectors.selectUser),
      this.store.select(AppSelectors.selectIsSafeMode),
      this.store.select(AppSelectors.selectIsDarkMode),
      this.store.select(AppSelectors.selectIsWideView),
      this.store.select(AppSelectors.selectIsDesktopView),
    ]).pipe(
      untilDestroyed(this),
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

  public onWhatsNew(): void {
    this.router.navigate(['whats-new']);
    this.close.emit();
  }

  public onLogin(): void {
    this.authDrawerService.openLogin();
    this.close.emit();
  }

  public onAccount(): void {
    this.router.navigate(['account']);
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
