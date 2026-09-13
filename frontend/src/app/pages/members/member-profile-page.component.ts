import {
  AvatarComponent,
  BadgeComponent,
  BarChartIconComponent,
  CardComponent,
  ExternalLinkIconComponent,
  ShieldCheckIconComponent,
  UserIconComponent,
} from '@eagami/ui';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { Member } from '@app/models';
import { FormatDatePipe } from '@app/pipes';
import { MetaAndTitleService } from '@app/services';
import { AuthSelectors } from '@app/store/auth';
import { MembersActions, MembersSelectors } from '@app/store/members';

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
    FormatDatePipe,
    PageHeaderComponent,
    ShieldCheckIconComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberProfilePageComponent implements OnInit {
  private readonly metaAndTitleService = inject(MetaAndTitleService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  protected readonly pageIcon = UserIconComponent;

  public viewModel$?: Observable<{
    member: Member | null;
    isAdminViewer: boolean;
    hasError: boolean;
  }>;

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Member Profile');
    this.metaAndTitleService.updateDescription('Profile of a London Chess Club member.');

    this.viewModel$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      tap(memberId => {
        if (memberId) {
          this.store.dispatch(MembersActions.fetchMemberRequested({ memberId }));
        }
      }),
      switchMap(memberId =>
        combineLatest([
          this.store.select(MembersSelectors.selectMemberById(memberId)),
          this.store.select(AuthSelectors.selectIsAdmin),
          this.store.select(MembersSelectors.selectCallState),
        ]).pipe(
          map(([member, isAdminViewer, callState]) => ({
            member: member ?? null,
            isAdminViewer,
            hasError: !member && callState.status === 'error',
          })),
        ),
      ),
    );
  }

  protected fullName(member: Member): string {
    return `${member.firstName} ${member.lastName}`;
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
