import {
  ArchiveIconComponent,
  AvatarComponent,
  CalendarDaysIconComponent,
  CameraIconComponent,
  HomeIconComponent,
  InfoIconComponent,
  NewspaperIconComponent,
  SettingsIconComponent,
  TrophyIconComponent,
  UsersIconComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';

import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { DropdownDirective } from '@app/directives/dropdown.directive';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { InternalLink } from '@app/models';
import { RouterLinkPipe } from '@app/pipes';
import { ClerkService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';

@Component({
  selector: 'lcc-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrl: './navigation-bar.component.scss',
  imports: [
    AvatarComponent,
    DropdownDirective,
    NgComponentOutlet,
    RouterLink,
    RouterLinkActive,
    RouterLinkPipe,
    SettingsIconComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:resize)': 'onResize()' },
})
export class NavigationBarComponent {
  private readonly clerkService = inject(ClerkService);
  private readonly store = inject(Store);

  public readonly links: InternalLink[] = [
    {
      text: 'Home',
      internalPath: '',
      icon: HomeIconComponent,
    },
    {
      text: 'About',
      internalPath: 'about',
      icon: InfoIconComponent,
    },
    {
      text: 'Members',
      internalPath: 'members',
      icon: UsersIconComponent,
    },
    {
      text: 'Schedule',
      internalPath: 'schedule',
      icon: CalendarDaysIconComponent,
    },
    {
      text: 'News',
      internalPath: 'news',
      icon: NewspaperIconComponent,
    },
    {
      text: 'City Champion',
      internalPath: 'city-champion',
      icon: TrophyIconComponent,
    },
    {
      text: 'Photo Gallery',
      internalPath: 'photo-gallery',
      icon: CameraIconComponent,
    },
    {
      text: 'Game Archives',
      internalPath: 'game-archives',
      icon: ArchiveIconComponent,
    },
  ];

  public readonly user = this.store.selectSignal(AuthSelectors.selectUser);

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

  public readonly isDropdownOpen = signal(false);
  public readonly screenWidth = signal(window.innerWidth);

  protected onResize(): void {
    this.screenWidth.set(window.innerWidth);
  }
}
