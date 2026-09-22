import {
  DataTableColumn,
  DataTableSortState,
  DownloadIconComponent,
  FileTextIconComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import moment from 'moment-timezone';

import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Inject,
  OnInit,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import {
  DataTableComponent,
  NO_SORT,
} from '@app/components/data-table/data-table.component';
import { DocumentViewerComponent } from '@app/components/document-viewer/document-viewer.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { ClubDocument } from '@app/models';
import { FormatDatePipe } from '@app/pipes';
import { DialogService, MetaAndTitleService, RoutingService } from '@app/services';
import { AppSelectors } from '@app/store/app';

export interface DocumentRow {
  id: string;
  document: ClubDocument;
  title: string;
  published: string;
  lastModified: string;
}

type CellTemplate = TemplateRef<{ $implicit: DocumentRow; value: unknown }>;

@UntilDestroy()
@Component({
  selector: 'lcc-documents-page',
  templateUrl: './documents-page.component.html',
  styleUrl: './documents-page.component.scss',
  imports: [
    DataTableComponent,
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

  private readonly router = inject(Router);
  private readonly store = inject(Store);

  // In the wide view the table spans the page, the document taking the surplus
  protected readonly isWideView = toSignal(
    this.store.select(AppSelectors.selectIsWideView),
    { initialValue: false },
  );

  private readonly documentCell = viewChild.required<CellTemplate>('documentCell');
  private readonly dateCell = viewChild.required<CellTemplate>('dateCell');

  protected readonly sort = signal<DataTableSortState>(NO_SORT);

  protected readonly rows: DocumentRow[] = this.documents.map(document => ({
    id: document.fileName,
    document,
    title: document.title,
    published: document.datePublished,
    lastModified: document.dateLastModified,
  }));

  protected readonly columns = computed<DataTableColumn<DocumentRow>[]>(() => [
    {
      key: 'title',
      label: 'Document',
      sortable: true,
      width: this.isWideView() ? '100%' : undefined,
      cellTemplate: this.documentCell(),
    },
    {
      key: 'published',
      label: 'Published',
      sortable: true,
      align: 'right',
      cellTemplate: this.dateCell(),
    },
    {
      key: 'lastModified',
      label: 'Last modified',
      sortable: true,
      align: 'right',
      cellTemplate: this.dateCell(),
    },
  ]);

  constructor(
    private readonly dialogService: DialogService,
    @Inject(DOCUMENT) private _document: Document,
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly routingService: RoutingService,
  ) {
    this.currentPath = this._document.location.pathname;
  }

  // A row leads where its title does: the document, named in the fragment
  protected readonly rowHref = ({ document }: DocumentRow): string =>
    `${this.currentPath}#${document.fileName}`;

  public onSorted(sort: DataTableSortState): void {
    this.sort.set(sort);
  }

  public onOpenDocument({ document }: DocumentRow): void {
    this.router.navigate([this.currentPath], { fragment: document.fileName });
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
