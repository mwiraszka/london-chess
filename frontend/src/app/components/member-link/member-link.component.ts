import { AvatarComponent } from '@eagami/ui';

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { NameOrder } from '@app/models';
import { MemberProfilesService } from '@app/services/member-profiles.service';
import { getInitials } from '@app/utils';

/**
 * Shows a member's current name, optionally beside their avatar, linked to their
 * profile page when they have one. Falls back to the given name, unlinked, when
 * there is no number or the member has no profile.
 */
@Component({
  selector: 'lcc-member-link',
  template: `
    <ng-template #content>
      @if (showAvatar()) {
        <ea-avatar
          size="xs"
          [alt]="displayName()"
          [initials]="initials()"
          [src]="avatarUrl()" />
      }
      <span>{{ displayName() }}</span>
    </ng-template>

    @let profile = memberProfile();
    @if (profile) {
      <a
        class="member-link"
        [class.lcc-link]="appearance() === 'link'"
        [class.member-link--with-avatar]="showAvatar()"
        [routerLink]="['/members', profile.number]">
        <ng-container [ngTemplateOutlet]="content" />
      </a>
    } @else {
      <span
        class="member-link"
        [class.member-link--with-avatar]="showAvatar()">
        <ng-container [ngTemplateOutlet]="content" />
      </span>
    }
  `,
  styleUrl: './member-link.component.scss',
  imports: [AvatarComponent, NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberLinkComponent implements OnInit {
  public readonly memberNumber = input<number | null>(null);
  public readonly name = input.required<string>();
  public readonly showAvatar = input(false);
  // Running prose shows the name as a link; everywhere else it reads as plain text
  public readonly appearance = input<'plain' | 'link'>('plain');
  // The order the given name is in, followed by the member's current name
  public readonly nameOrder = input<NameOrder>('first-last');

  private readonly memberProfiles = inject(MemberProfilesService);

  protected readonly memberProfile = computed(() =>
    this.memberProfiles.profileFor(this.memberNumber()),
  );
  protected readonly displayName = computed(() =>
    this.memberProfiles.nameFor(this.memberNumber(), this.name(), this.nameOrder()),
  );
  protected readonly avatarUrl = computed(() =>
    this.memberProfiles.avatarUrlFor(this.memberNumber()),
  );
  protected readonly initials = computed(() => getInitials(this.displayName()));

  public ngOnInit(): void {
    if (this.memberNumber() !== null) {
      void this.memberProfiles.load();
    }
  }
}
