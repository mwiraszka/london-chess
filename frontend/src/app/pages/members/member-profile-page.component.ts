import {
  AvatarComponent,
  BadgeComponent,
  BarChartIconComponent,
  CardComponent,
  ExternalLinkIconComponent,
  ShieldCheckIconComponent,
  SkeletonComponent,
  TrophyIconComponent,
  UserIconComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
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

import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MemberTournamentsComponent } from '@app/components/member-tournaments/member-tournaments.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { PLACEHOLDER_PROFILE_MEMBER } from '@app/constants/member-profile';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { LoadStatus, Member } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { MembersActions, MembersSelectors } from '@app/store/members';
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
    LoadFailedComponent,
    MemberTournamentsComponent,
    PageHeaderComponent,
    RouterLink,
    ShieldCheckIconComponent,
    SkeletonComponent,
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
  protected readonly placeholderMember = PLACEHOLDER_PROFILE_MEMBER;

  public viewModel$?: Observable<{
    member: Member | null;
    memberNumber: number;
    status: LoadStatus;
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

    this.viewModel$ = this.route.paramMap.pipe(
      map(params => Number(params.get('number'))),
      switchMap(memberNumber =>
        combineLatest([
          this.store.select(MembersSelectors.selectMemberByNumber(memberNumber)),
          this.store.select(MembersSelectors.selectMemberProfileStatus(memberNumber)),
        ]).pipe(map(([member, status]) => ({ member, memberNumber, status }))),
      ),
    );
  }

  public onRetry(memberNumber: number): void {
    this.store.dispatch(MembersActions.fetchMemberByNumberRequested({ memberNumber }));
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
