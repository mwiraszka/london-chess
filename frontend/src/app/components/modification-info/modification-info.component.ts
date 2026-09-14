import { AvatarComponent, EditIconComponent, FilePlusIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, Input, OnInit, inject } from '@angular/core';

import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { ModificationInfo } from '@app/models';
import { FormatDatePipe } from '@app/pipes';
import { MemberProfilesService } from '@app/services';
import { getInitials } from '@app/utils';

@Component({
  selector: 'lcc-modification-info',
  template: `
    <div class="modification-info-container">
      <div class="create-details-container">
        <ea-icon-file-plus />

        <div class="create-text">
          @let creator = memberProfiles.nameFor(info.createdByNumber, info.createdBy);
          <span>created by</span>
          <ea-avatar
            class="author-avatar"
            size="xs"
            [alt]="creator"
            [src]="memberProfiles.avatarUrlFor(info.createdByNumber)"
            [initials]="initialsFor(creator)" />
          <span class="name">
            <lcc-member-link
              [memberNumber]="info.createdByNumber"
              [name]="info.createdBy" />
          </span>
          <span class="vertical-spacer">|</span>
          <span class="date">{{ info.dateCreated | formatDate: 'short' }}</span>
        </div>
      </div>

      @if (info.dateCreated !== info.dateLastEdited) {
        <div class="edit-details-container">
          <ea-icon-edit />

          <div class="edit-text">
            <span>last edited by</span>
            <span class="name">
              <lcc-member-link
                [memberNumber]="info.lastEditedByNumber"
                [name]="info.lastEditedBy" />
            </span>
            <span class="vertical-spacer">|</span>
            <span class="date">{{ info.dateLastEdited | formatDate: 'short' }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './modification-info.component.scss',
  imports: [
    AvatarComponent,
    EditIconComponent,
    FilePlusIconComponent,
    FormatDatePipe,
    MemberLinkComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModificationInfoComponent implements OnInit {
  @Input({ required: true }) info!: ModificationInfo;

  protected readonly memberProfiles = inject(MemberProfilesService);

  public ngOnInit(): void {
    void this.memberProfiles.load();
  }

  protected initialsFor(name: string): string | undefined {
    return getInitials(name);
  }
}
