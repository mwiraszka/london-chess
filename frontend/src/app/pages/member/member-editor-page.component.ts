import { ShieldCheckIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { MemberFormComponent } from '@app/components/member-form/member-form.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { EditorPage, Id, InternalLink, Member, MemberFormData } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { AppSelectors } from '@app/store/app';
import { MembersActions, MembersSelectors } from '@app/store/members';

@UntilDestroy()
@Component({
  selector: 'lcc-member-editor-page',
  template: `
    @if (viewModel$ | async; as vm) {
      @if (vm.isFormReady) {
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
          (requestAddMember)="onRequestAddMember($event.notifyMember)"
          (requestUpdateMember)="
            onRequestUpdateMember($event.memberId, $event.notifyMember)
          "
          (restore)="onRestore($event)">
        </lcc-member-form>
      }

      <lcc-link-list [links]="[membersPageLink]"></lcc-link-list>
    }
  `,
  imports: [CommonModule, LinkListComponent, MemberFormComponent, PageHeaderComponent],
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
    isFormReady: boolean;
    isSafeMode: boolean;
    originalMember: Member | null;
    pageHeading: string;
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
          this.store.select(MembersSelectors.selectRecordsScope),
        ]).pipe(
          map(
            ([
              originalMember,
              formData,
              hasUnsavedChanges,
              isSafeMode,
              recordsScope,
            ]) => ({
              originalMember,
              formData,
              hasUnsavedChanges,
              // The form reads its values once, so it waits for the record admins fetch
              isFormReady:
                memberId === null || (!!originalMember && recordsScope === 'admin'),
              isSafeMode,
              pageHeading: originalMember
                ? `Edit ${originalMember.firstName} ${originalMember.lastName}`
                : 'Add a member',
            }),
          ),
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

  public onRequestAddMember(notifyMember: boolean): void {
    this.store.dispatch(MembersActions.addMemberRequested({ notifyMember }));
  }

  public onRequestUpdateMember(memberId: Id, notifyMember: boolean): void {
    this.store.dispatch(MembersActions.updateMemberRequested({ memberId, notifyMember }));
  }

  public onRestore(memberId: Id | null): void {
    this.store.dispatch(MembersActions.formDataRestored({ memberId }));
  }
}
