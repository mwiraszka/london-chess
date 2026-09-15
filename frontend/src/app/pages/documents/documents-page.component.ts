import { DownloadIconComponent, FileTextIconComponent } from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import moment from 'moment-timezone';

import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Inject,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { DocumentViewerComponent } from '@app/components/document-viewer/document-viewer.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { ClubDocument } from '@app/models';
import { FormatDatePipe } from '@app/pipes';
import { DialogService, MetaAndTitleService, RoutingService } from '@app/services';

@UntilDestroy()
@Component({
  selector: 'lcc-documents-page',
  templateUrl: './documents-page.component.html',
  styleUrl: './documents-page.component.scss',
  imports: [
    DownloadIconComponent,
    FileTextIconComponent,
    FormatDatePipe,
    PageHeaderComponent,
    RouterLink,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsPageComponent implements OnInit {
  protected readonly pageIcon = FileTextIconComponent;

  public readonly documents: ClubDocument[] = [
    {
      title: 'Club Bylaws',
      fileName: 'lcc-bylaws.pdf',
      datePublished: moment('2024-04-24T04:00:00').toISOString(),
      dateLastModified: moment('2024-04-24T04:00:00').toISOString(),
    },
    {
      title: 'Board Meeting - DEC 12, 2023 - Minutes',
      fileName: 'lcc-board-meeting-2023-12-12-minutes.pdf',
      datePublished: moment('2024-04-24T04:00:00').toISOString(),
      dateLastModified: moment('2025-03-20T00:00:00').toISOString(),
    },
    {
      title: 'Board Meeting - JAN 9, 2024 - Minutes',
      fileName: 'lcc-board-meeting-2024-01-09-minutes.pdf',
      datePublished: moment('2024-04-24T04:00:00').toISOString(),
      dateLastModified: moment('2025-03-20T00:00:00').toISOString(),
    },
    {
      title: 'Board Meeting - APR 2, 2024 - Minutes',
      fileName: 'lcc-board-meeting-2024-04-02-minutes.pdf',
      datePublished: moment('2024-04-24T04:00:00').toISOString(),
      dateLastModified: moment('2025-03-20T00:00:00').toISOString(),
    },
    {
      title: 'Membership Fees 2025 - 2028 (Incremental Plan to Break Even)',
      fileName: 'lcc-membership-fees-2025-to-2028.pdf',
      datePublished: '2025-01-24',
      dateLastModified: '2025-01-24',
    },
    {
      title: 'Code of Conduct',
      fileName: 'lcc-code-of-conduct.pdf',
      datePublished: '2025-03-20',
      dateLastModified: '2025-03-20',
    },
  ];
  public currentPath!: string;

  constructor(
    private readonly dialogService: DialogService,
    @Inject(DOCUMENT) private _document: Document,
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly routingService: RoutingService,
  ) {
    this.currentPath = this._document.location.pathname;
  }

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('Documents');
    this.metaAndTitleService.updateDescription(
      'A place for all London Chess Club documentation.',
    );

    this.routingService.fragment$.pipe(untilDestroyed(this)).subscribe(async fragment => {
      if (
        fragment &&
        this.documents.find(document => document.fileName === fragment) &&
        !this.dialogService.topDialogRef
      ) {
        await this.dialogService.open<DocumentViewerComponent, null>({
          componentType: DocumentViewerComponent,
          isModal: true,
          inputs: { documentPath: `assets/documents/${fragment}` },
        });

        // Only remove fragment if it's still the same as when we opened
        // (prevents removing fragment when an old dialog closes after navigation)
        if (this.routingService.currentFragment === fragment) {
          this.routingService.removeFragment();
        }
      }
    });
  }
}
