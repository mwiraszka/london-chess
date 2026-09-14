import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { MemberProfilesService } from '@app/services/member-profiles.service';

/**
 * Shows a member's current name, linked to their profile page, for a member
 * referenced by number. Falls back to the given name, unlinked, when there is no
 * number or the member has no profile.
 */
@Component({
  selector: 'lcc-member-link',
  template: `
    @let profile = memberProfile();
    @if (profile) {
      <a
        class="lcc-link"
        [routerLink]="['/members', profile.number]">
        <span>{{ displayName() }}</span>
      </a>
    } @else {
      <span>{{ displayName() }}</span>
    }
  `,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberLinkComponent implements OnInit {
  public readonly memberNumber = input<number | null>(null);
  public readonly name = input.required<string>();

  private readonly memberProfiles = inject(MemberProfilesService);

  protected readonly memberProfile = computed(() =>
    this.memberProfiles.profileFor(this.memberNumber()),
  );
  protected readonly displayName = computed(() =>
    this.memberProfiles.nameFor(this.memberNumber(), this.name()),
  );

  public ngOnInit(): void {
    if (this.memberNumber() !== null) {
      void this.memberProfiles.load();
    }
  }
}
