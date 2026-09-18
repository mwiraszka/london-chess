import { ShieldCheckIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { FormSkeletonComponent } from '@app/components/form-skeleton/form-skeleton.component';
import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { LoadFailedComponent } from '@app/components/load-failed/load-failed.component';
import { MemberFormComponent } from '@app/components/member-form/member-form.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import {
  EditorPage,
  Id,
  InternalLink,
  LoadStatus,
  Member,
  MemberFormData,
} from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { AppSelectors } from '@app/store/app';
import { MembersActions, MembersSelectors } from '@app/store/members';

@UntilDestroy()
@Component({
  selector: 'lcc-member-editor-page',
  template: `
    @if (viewModel$ | async; as vm) {
      @switch (vm.status) {
        @case ('loaded') {
          <lcc-page-header
            [hasUnsavedChanges]="vm.hasUnsavedChanges"
            [icon]="adminIcon"
            [heading]="vm.pageHeading">
          </lcc-page-header>

          <lcc-member-form
            [formData]="vm.formData"
            [hasUnsavedChanges]="vm.hasUnsavedChanges"
            [isSafeMode]="vm.isSafeMode"
            [originalMember]="vm.originalMember"
            (cancel)="onCancel()"
            (change)="onChange($event.memberId, $event.formData)"
            (restore)="onRestore($event)">
          </lcc-member-form>
        }
        @case ('failed') {
          <lcc-load-failed
            title="Unable to load this member"
            (retry)="onRetry(vm.memberId)" />
        }
        @default {
          <lcc-form-skeleton [fieldCount]="12" />
        }
      }

      <lcc-link-list [links]="[membersPageLink]"></lcc-link-list>
    }
  `,
  imports: [
    CommonModule,
    FormSkeletonComponent,
    LinkListComponent,
    LoadFailedComponent,
    MemberFormComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberEditorPageComponent implements EditorPage, OnInit {
  protected readonly adminIcon = ShieldCheckIconComponent;

  public readonly entity = 'member';
  public readonly membersPageLink: InternalLink = {
    text: 'See all members',
    internalPath: 'members',
  };
  public viewModel$?: Observable<{
    formData: MemberFormData;
    hasUnsavedChanges: boolean;
    isSafeMode: boolean;
    memberId: Id | null;
    originalMember: Member | null;
    pageHeading: string;
    status: LoadStatus;
  }>;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly store: Store,
  ) {}

  public ngOnInit(): void {
    this.viewModel$ = this.activatedRoute.params.pipe(
      untilDestroyed(this),
      map(params => (params['member_id'] ?? null) as string | null),
      switchMap(memberId =>
        combineLatest([
          this.store.select(MembersSelectors.selectMemberById(memberId)),
          this.store.select(MembersSelectors.selectMemberFormDataById(memberId)),
          this.store.select(MembersSelectors.selectHasUnsavedChanges(memberId)),
          this.store.select(AppSelectors.selectIsSafeMode),
          memberId
            ? this.store.select(MembersSelectors.selectEditableMemberStatus(memberId))
            : of<LoadStatus>('loaded'),
        ]).pipe(
          map(([originalMember, formData, hasUnsavedChanges, isSafeMode, status]) => ({
            originalMember,
            formData,
            hasUnsavedChanges,
            isSafeMode,
            memberId,
            pageHeading: originalMember
              ? `Edit ${originalMember.firstName} ${originalMember.lastName}`
              : 'Add a member',
            status,
          })),
        ),
      ),
      tap(viewModel => {
        this.metaAndTitleService.updateTitle(viewModel.pageHeading);
        this.metaAndTitleService.updateDescription(
          `${viewModel.pageHeading} for the London Chess Club.`,
        );
      }),
    );
  }

  public onCancel(): void {
    this.store.dispatch(MembersActions.cancelSelected());
  }

  public onChange(memberId: Id | null, formData: Partial<MemberFormData>): void {
    this.store.dispatch(MembersActions.formDataChanged({ memberId, formData }));
  }

  public onRetry(memberId: Id | null): void {
    if (memberId) {
      this.store.dispatch(MembersActions.fetchMemberRequested({ memberId }));
    }
  }

  public onRestore(memberId: Id | null): void {
    this.store.dispatch(MembersActions.formDataRestored({ memberId }));
  }
}
