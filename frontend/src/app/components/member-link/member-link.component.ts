import { Store } from '@ngrx/store';

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Id } from '@app/models';
import { MembersSelectors } from '@app/store/members';

/**
 * Wraps a member's name with a link to their profile page. Pass `memberId`
 * when known; otherwise pass `name` ("First Last") and the member is resolved
 * from the loaded members, falling back to plain text when no match exists.
 */
@Component({
  selector: 'lcc-member-link',
  template: `
    <ng-template #content>
      <ng-content></ng-content>
    </ng-template>

    @if (profileId(); as id) {
      <a
        class="lcc-link"
        [routerLink]="['/members', id]">
        <ng-template [ngTemplateOutlet]="content"></ng-template>
      </a>
    } @else {
      <ng-template [ngTemplateOutlet]="content"></ng-template>
    }
  `,
  imports: [NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberLinkComponent {
  public readonly memberId = input<Id | null>(null);
  public readonly name = input<string | null>(null);

  private readonly store = inject(Store);

  private readonly allMembers = this.store.selectSignal(
    MembersSelectors.selectAllMembers,
  );

  public readonly profileId = computed<Id | null>(() => {
    const id = this.memberId();
    if (id) {
      return id;
    }

    const name = this.name()?.trim().toLowerCase();
    if (!name) {
      return null;
    }
    return (
      this.allMembers().find(
        member => `${member.firstName} ${member.lastName}`.trim().toLowerCase() === name,
      )?.id ?? null
    );
  });
}
