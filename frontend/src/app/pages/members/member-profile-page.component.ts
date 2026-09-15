import {
  AvatarComponent,
  BadgeComponent,
  BarChartIconComponent,
  CardComponent,
  ExternalLinkIconComponent,
  ShieldCheckIconComponent,
  TrophyIconComponent,
  UserIconComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { Member } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { MembersSelectors } from '@app/store/members';
import { isCityChampion } from '@app/utils';

@Component({
  selector: 'lcc-member-profile-page',
  templateUrl: './member-profile-page.component.html',
  styleUrl: './member-profile-page.component.scss',
  imports: [
    AvatarComponent,
    BadgeComponent,
    BarChartIconComponent,
    CardComponent,
    CommonModule,
    ExternalLinkIconComponent,
    PageHeaderComponent,
    RouterLink,
    ShieldCheckIconComponent,
    TooltipDirective,
    TrophyIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberProfilePageComponent implements OnInit {
  protected readonly isCityChampion = isCityChampion;

  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  private readonly memberName = viewChild<ElementRef<HTMLElement>>('memberName');

  protected readonly isNameTruncated = signal(false);
  protected readonly pageIcon = UserIconComponent;

  public viewModel$?: Observable<{
    member: Member | null;
  }>;

  constructor() {
    // Truncation depends on the rendered width of each name part, which changes
    // with the card's size and with the name itself
    effect(onCleanup => {
      const name = this.memberName()?.nativeElement;
      if (!name) {
        return;
      }

      const parts = Array.from(name.children);
      const observer = new ResizeObserver(() =>
        this.isNameTruncated.set(parts.some(part => part.scrollWidth > part.clientWidth)),
      );
      parts.forEach(part => observer.observe(part));
      onCleanup(() => observer.disconnect());
    });
  }

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Member Profile');
    this.metaAndTitleService.updateDescription('Profile of a London Chess Club member.');

    // The route guard has already loaded the member for every number this page shows
    this.viewModel$ = this.route.paramMap.pipe(
      map(params => Number(params.get('number'))),
      switchMap(memberNumber =>
        this.store.select(MembersSelectors.selectMemberByNumber(memberNumber)),
      ),
      map(member => ({ member })),
    );
  }

  protected fullName(member: Member): string {
    return `${member.firstName} ${member.lastName}`;
  }

  // Member 2's join date is shown as 105 BC, a year the stored ISO join date cannot hold
  protected yearJoined(member: Member): string | undefined {
    return member.number === 2 ? '105 B.C.' : member.yearJoined;
  }

  protected initials(member: Member): string {
    return `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();
  }

  protected chessComUrl(member: Member): string {
    return `https://www.chess.com/member/${member.chessComUsername}`;
  }

  protected lichessUrl(member: Member): string {
    return `https://lichess.org/@/${member.lichessUsername}`;
  }
}
