import { EditIconComponent, FilePlusIconComponent } from '@eagami/ui';

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { ModificationInfo } from '@app/models';
import { FormatDatePipe } from '@app/pipes';

@Component({
  selector: 'lcc-modification-info',
  template: `
    <div class="modification-info-container">
      <div class="create-details-container">
        <ea-icon-file-plus />

        <div class="create-text">
          <span>created by</span>
          <span class="name">
            <lcc-member-link [name]="info.createdBy">
              <span>{{ info.createdBy }}</span>
            </lcc-member-link>
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
              <lcc-member-link [name]="info.lastEditedBy">
                <span>{{ info.lastEditedBy }}</span>
              </lcc-member-link>
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
    EditIconComponent,
    FilePlusIconComponent,
    FormatDatePipe,
    MemberLinkComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModificationInfoComponent {
  @Input({ required: true }) info!: ModificationInfo;
}
